import { useEffect, useMemo, useState, Fragment } from "react";
import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { db } from "../../../firebase-config";
import "./FormAAnalytics.css";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const categories = [
    "4Ps",
    "Non-4Ps",
    "USAPAN",
    "PMOC",
    "House to House",
    "Profiled Only",
    "Others",
];

const createCategoryObject = () => ({
    "4Ps": 0,
    "Non-4Ps": 0,
    "USAPAN": 0,
    "PMOC": 0,
    "House to House": 0,
    "Profiled Only": 0,
    "Others": 0,
});

function classifyClass(value) {

    const text = (value || "").toLowerCase().trim();

    if (text.includes("4ps") && !text.includes("non"))
        return "4Ps";

    if (text.includes("non"))
        return "Non-4Ps";

    if (text.includes("usapan"))
        return "USAPAN";

    if (text.includes("pmoc"))
        return "PMOC";

    if (text.includes("house"))
        return "House to House";

    if (text.includes("profile"))
        return "Profiled Only";

    return "Others";
}

function FormAAnalytics() {

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    /*
    ====================================================
                    PDF EXPORT
    ====================================================
    */

    const exportPDF = () => {

        const doc = new jsPDF("landscape");

        doc.setFontSize(16);
        doc.text("Official Form A Report", 14, 15);

        autoTable(doc, {
            startY: 25,
            head: [[
                "Month",
                "Classes Held",
                "Target Couples",
                "Individuals Reached",
                "Male Solo",
                "Female Solo",
                "Total Solo",
                "Couple Attendees"
            ]],
            body: monthlySummary.map(row => [
                row.month,
                row.classes,
                row.target,
                row.reached,
                row.maleSolo,
                row.femaleSolo,
                row.totalSolo,
                row.coupleAttendees,
            ])
        });

        doc.save("Official_Form_A_Report.pdf");
    };


    /*
    ====================================================
                EXCEL TEMPLATE EXPORT
    ====================================================
    */

    const exportOfficialExcel = async () => {

        try {

            const response = await fetch(
                "/templates/FormA_Template.xlsx"
            );

            const buffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();

            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            /*
                IMPORTANT

                Change this row number if
                JANUARY starts on another row
                in your template.
            */

            let currentRow = 9;

            monthNames.forEach(month => {

                const row = analytics.monthly[month];

                // Month
                sheet.getCell(`A${currentRow}`).value = month;

                // Classes Held
                sheet.getCell(`B${currentRow}`).value = row.classesHeld["4Ps"];
                sheet.getCell(`C${currentRow}`).value = row.classesHeld["Non-4Ps"];
                sheet.getCell(`D${currentRow}`).value = row.classesHeld["USAPAN"];
                sheet.getCell(`E${currentRow}`).value = row.classesHeld["PMOC"];
                sheet.getCell(`F${currentRow}`).value = row.classesHeld["House to House"];
                sheet.getCell(`G${currentRow}`).value = row.classesHeld["Profiled Only"];
                sheet.getCell(`H${currentRow}`).value = row.classesHeld["Others"];
                sheet.getCell(`I${currentRow}`).value = row.classes;

                // Target Couples
                sheet.getCell(`J${currentRow}`).value = row.target;

                // Individuals Reached
                sheet.getCell(`K${currentRow}`).value = row.individualsReached["4Ps"];
                sheet.getCell(`L${currentRow}`).value = row.individualsReached["Non-4Ps"];
                sheet.getCell(`M${currentRow}`).value = row.individualsReached["USAPAN"];
                sheet.getCell(`N${currentRow}`).value = row.individualsReached["PMOC"];
                sheet.getCell(`O${currentRow}`).value = row.individualsReached["House to House"];
                sheet.getCell(`P${currentRow}`).value = row.individualsReached["Profiled Only"];
                sheet.getCell(`Q${currentRow}`).value = row.individualsReached["Others"];
                sheet.getCell(`R${currentRow}`).value = row.reached;

                // Solo / Couple
                sheet.getCell(`S${currentRow}`).value = row.maleSolo;
                sheet.getCell(`T${currentRow}`).value = row.femaleSolo;
                sheet.getCell(`U${currentRow}`).value = row.totalSolo;
                sheet.getCell(`V${currentRow}`).value = row.coupleAttendees;

                currentRow++;

            });

            const excelBuffer =
                await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                "Official_Form_A_Report.xlsx"
            );

        }

        catch (error) {

            console.error(error);

            alert("Failed to export Form A.");

        }

    };



    useEffect(() => {

        const fetchClients = async () => {

            try {

                const q = query(
                    collection(db, "clients_public"),
                    where("is_archived", "==", false)
                );

                const snapshot = await getDocs(q);

                const records = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setClients(records);

            }

            catch (err) {

                console.error(err);

            }

            setLoading(false);

        };

        fetchClients();

    }, []);

    const analytics = useMemo(() => {

        const monthly = {};

        monthNames.forEach(month => {

            monthly[month] = {

                month,

                classesHeld: createCategoryObject(),

                individualsReached: createCategoryObject(),

                classes: 0,

                reached: 0,

                target: 0,

                participants: 0,

                maleSolo: 0,

                femaleSolo: 0,

                totalSolo: 0,

                coupleAttendees: 0,

            };

        });

        const overallClasses = createCategoryObject();

        const overallReached = createCategoryObject();

        let totalParticipants = 0;

        let maleSolo = 0;

        let femaleSolo = 0;

        let coupleAttendees = 0;

        clients.forEach(client => {

            if (!client.created_at?.toDate) return;

            const date = client.created_at.toDate();

            const month =
                monthNames[date.getMonth()];

            const row =
                monthly[month];

            const category =
                classifyClass(client.classes_held);

            row.classesHeld[category]++;

            overallClasses[category]++;

            row.classes++;

            const hasMale =
                client.name &&
                client.name.trim() !== "";

            const hasFemale =
                client.spouse_name &&
                client.spouse_name.trim() !== "";

            // -------------------------
            // TARGET COUPLES
            // -------------------------

            if (hasMale && hasFemale) {

                row.target++;

                row.coupleAttendees++;

                coupleAttendees++;

            }

            // -------------------------
            // INDIVIDUALS REACHED
            // -------------------------

            if (hasMale) {

                row.individualsReached[category]++;

                overallReached[category]++;

                row.reached++;

                row.participants++;

                totalParticipants++;

            }

            if (hasFemale) {

                row.individualsReached[category]++;

                overallReached[category]++;

                row.reached++;

                row.participants++;

                totalParticipants++;

            }

            // -------------------------
            // SOLO ATTENDEES
            // -------------------------

            if (hasMale && !hasFemale) {

                row.maleSolo++;

                maleSolo++;

            }

            if (hasFemale && !hasMale) {

                row.femaleSolo++;

                femaleSolo++;

            }

            row.totalSolo =
                row.maleSolo +
                row.femaleSolo;

        });

        const totalSolo =
            maleSolo +
            femaleSolo;

        return {

            monthly,

            overallClasses,

            overallReached,

            totalParticipants,

            maleSolo,

            femaleSolo,

            totalSolo,

            coupleAttendees,

        };

    }, [clients]);

    const monthlySummary =
        monthNames.map(
            month => analytics.monthly[month]
        );

    const categoryCounts =
        analytics.overallClasses;

    const reachedCounts =
        analytics.overallReached;

    const totalParticipants =
        analytics.totalParticipants;

    const maleSolo =
        analytics.maleSolo;

    const femaleSolo =
        analytics.femaleSolo;

    const totalSolo =
        analytics.totalSolo;

    const coupleAttendees =
        analytics.coupleAttendees;

    if (loading) {
        return (
            <div className="form-a-loading">
                Loading Form A Analytics...
            </div>
        );
    }

    return (

        <div className="form-a-container">

            {/* KPI CARDS */}

            <div className="form-a-cards">

                <div className="fa-card blue">

                    <small>Total Classes Held</small>

                    <h2>
                        {
                            Object.values(categoryCounts)
                                .reduce((a, b) => a + b, 0)
                        }
                    </h2>

                </div>

                <div className="fa-card green">

                    <small>Individuals Reached</small>

                    <h2>{totalParticipants}</h2>

                </div>

                <div className="fa-card purple">

                    <small>Target Couples</small>

                    <h2>{coupleAttendees}</h2>

                </div>

                <div className="fa-card orange">

                    <small>Male Solo</small>

                    <h2>{maleSolo}</h2>

                </div>

                <div className="fa-card pink">

                    <small>Female Solo</small>

                    <h2>{femaleSolo}</h2>

                </div>

            </div>


            {/* SUMMARY GRID */}

            <div className="summary-grid">

                {/* Classes */}

                <div className="summary-panel">

                    <div className="panel-title">

                        <h3>Classes Conducted</h3>

                        <strong>
                            {
                                Object.values(categoryCounts)
                                    .reduce((a, b) => a + b, 0)
                            }
                        </strong>

                    </div>

                    {

                        categories.map(category => (

                            <div
                                className="progress-row"
                                key={category}
                            >

                                <span>{category}</span>

                                <div className="progress">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width:
                                                `${(
                                                    categoryCounts[category] /
                                                    Math.max(
                                                        ...Object.values(categoryCounts),
                                                        1
                                                    )
                                                ) * 100
                                                }%`
                                        }}
                                    />

                                </div>

                                <strong>

                                    {categoryCounts[category]}

                                </strong>

                            </div>

                        ))

                    }

                </div>


                {/* Individuals */}

                <div className="summary-panel">

                    <div className="panel-title">

                        <h3>

                            Individuals Reached

                        </h3>

                        <strong>

                            {totalParticipants}

                        </strong>

                    </div>

                    {

                        categories.map(category => (

                            <div
                                className="progress-row"
                                key={category}
                            >

                                <span>

                                    {category}

                                </span>

                                <div className="progress">

                                    <div

                                        className="progress-fill green"

                                        style={{

                                            width:

                                                `${(
                                                    reachedCounts[category] /
                                                    Math.max(
                                                        ...Object.values(reachedCounts),
                                                        1
                                                    )
                                                ) * 100
                                                }%`

                                        }}

                                    />

                                </div>

                                <strong>

                                    {reachedCounts[category]}

                                </strong>

                            </div>

                        ))

                    }

                </div>

            </div>


            {/* ATTENDANCE SUMMARY */}

            <div className="solo-couple-summary">

                <h3>

                    Attendance Summary

                </h3>

                <div className="attendance-summary">

                    <div>

                        <small>

                            Male Solo

                        </small>

                        <h2>

                            {maleSolo}

                        </h2>

                    </div>

                    <div>

                        <small>

                            Female Solo

                        </small>

                        <h2>

                            {femaleSolo}

                        </h2>

                    </div>

                    <div>

                        <small>

                            Total Solo

                        </small>

                        <h2>

                            {totalSolo}

                        </h2>

                    </div>

                    <div>

                        <small>

                            Couple Attendees

                        </small>

                        <h2>

                            {coupleAttendees}

                        </h2>

                    </div>

                    <div>

                        <small>

                            Individuals Reached

                        </small>

                        <h2>

                            {totalParticipants}

                        </h2>

                    </div>

                </div>

            </div>

            {/* ==========================================
    MONTHLY SUMMARY
========================================== */}

            <div className="monthly-summary">

                <h3>

                    Monthly Summary

                </h3>

                <table className="monthly-summary-table">

                    <thead>

                        <tr>

                            <th>Month</th>

                            <th>Classes Held</th>

                            <th>Target Couples</th>

                            <th>Individuals Reached</th>

                            <th>Male Solo</th>

                            <th>Female Solo</th>

                            <th>Total Solo</th>

                            <th>Couple Attendees</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            monthlySummary.map(row => (

                                <tr key={row.month}>

                                    <td>

                                        {row.month}

                                    </td>

                                    <td>

                                        {row.classes}

                                    </td>

                                    <td>

                                        {row.target}

                                    </td>

                                    <td>

                                        {row.reached}

                                    </td>

                                    <td>

                                        {row.maleSolo}

                                    </td>

                                    <td>

                                        {row.femaleSolo}

                                    </td>

                                    <td>

                                        {row.totalSolo}

                                    </td>

                                    <td>

                                        {row.coupleAttendees}

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>

                                TOTAL

                            </th>

                            <th>

                                {

                                    monthlySummary.reduce(

                                        (sum, row) =>

                                            sum + row.classes,

                                        0

                                    )

                                }

                            </th>

                            <th>

                                {

                                    monthlySummary.reduce(

                                        (sum, row) =>

                                            sum + row.target,

                                        0

                                    )

                                }

                            </th>

                            <th>

                                {

                                    monthlySummary.reduce(

                                        (sum, row) =>

                                            sum + row.reached,

                                        0

                                    )

                                }

                            </th>

                            <th>

                                {maleSolo}

                            </th>

                            <th>

                                {femaleSolo}

                            </th>

                            <th>

                                {totalSolo}

                            </th>

                            <th>

                                {coupleAttendees}

                            </th>

                        </tr>

                    </tfoot>

                </table>

            </div>
            {/* ===========================
                OFFICIAL FORM A REPORT
            =========================== */}

            <div className="official-report">

                <div className="official-header">

                    <div>

                        <h2>Official Form A Report</h2>

                        <p>

                            Family Planning Classes and Individuals Reached

                        </p>

                    </div>

                    <div className="report-buttons">

                        <button
                            className="pdf-btn"
                            onClick={exportPDF}
                        >

                            Export PDF

                        </button>


                        <button
    className="excel-btn"
    onClick={exportOfficialExcel}
>
    Export Excel
</button>

                    </div>

                </div>

                <div className="official-table-wrapper">

                    <table className="official-table">

                        <thead>

                            <tr>

                                <th rowSpan="3" style={{ width: "180px" }}>

                                    Month

                                </th>

                                <th colSpan="7">

                                    No. of Classes Held

                                </th>

                                <th rowSpan="3">

                                    TOTAL

                                </th>

                                <th rowSpan="3">

                                    No. of Target Couples

                                </th>

                                <th colSpan="7">

                                    No. of Individuals Reached

                                </th>

                                <th rowSpan="3">

                                    TOTAL

                                </th>

                                <th colSpan="4">

                                    Solo / Couple

                                </th>

                            </tr>

                            <tr>

                                {categories.map(cat => (

                                    <th key={cat} rowSpan="2">

                                        {cat}

                                    </th>

                                ))}

                                {categories.map(cat => (

                                    <th key={"r" + cat} rowSpan="2">

                                        {cat}

                                    </th>

                                ))}

                                <th colSpan="2">

                                    Solo

                                </th>

                                <th rowSpan="2">

                                    Total Solo

                                </th>

                                <th rowSpan="2">

                                    Couple

                                </th>

                            </tr>

                            <tr>

                                <th>Male</th>

                                <th>Female</th>

                            </tr>

                        </thead>

                        <tbody>

                            {monthNames.map((month) => {

                                const monthData = analytics.monthly[month];


                                const quarterMonths = {

                                    March: [
                                        "January",
                                        "February",
                                        "March"
                                    ],

                                    June: [
                                        "April",
                                        "May",
                                        "June"
                                    ],

                                    September: [
                                        "July",
                                        "August",
                                        "September"
                                    ],

                                    December: [
                                        "October",
                                        "November",
                                        "December"
                                    ]

                                };


                                const isQuarterEnd =
                                    Object.keys(quarterMonths)
                                        .includes(month);



                                return (

                                    <Fragment key={month}>


                                        {/* MONTH ROW */}

                                        <tr>


                                            <td>

                                                {month}

                                            </td>



                                            {/* CLASSES HELD */}

                                            {categories.map(cat => (

                                                <td key={cat}>

                                                    {monthData.classesHeld[cat]}

                                                </td>

                                            ))}



                                            <td>

                                                {monthData.classes}

                                            </td>




                                            {/* TARGET COUPLES */}

                                            <td>

                                                {monthData.target}

                                            </td>




                                            {/* INDIVIDUALS REACHED */}

                                            {categories.map(cat => (

                                                <td key={"reach-" + cat}>

                                                    {monthData.individualsReached[cat]}

                                                </td>

                                            ))}



                                            <td>

                                                {monthData.reached}

                                            </td>




                                            {/* SOLO / COUPLE */}

                                            <td>

                                                {monthData.maleSolo}

                                            </td>


                                            <td>

                                                {monthData.femaleSolo}

                                            </td>


                                            <td>

                                                {monthData.totalSolo}

                                            </td>


                                            <td>

                                                {monthData.coupleAttendees}

                                            </td>



                                        </tr>




                                        {/* QUARTER SUBTOTAL */}

                                        {isQuarterEnd && (

                                            (() => {


                                                const subtotalClasses =
                                                    createCategoryObject();


                                                const subtotalReached =
                                                    createCategoryObject();



                                                quarterMonths[month]
                                                    .forEach(m => {


                                                        const data =
                                                            analytics.monthly[m];



                                                        categories.forEach(cat => {


                                                            subtotalClasses[cat]
                                                                += data.classesHeld[cat];


                                                            subtotalReached[cat]
                                                                += data.individualsReached[cat];


                                                        });


                                                    });




                                                const classTotal =
                                                    Object.values(subtotalClasses)
                                                        .reduce(
                                                            (sum, value) =>
                                                                sum + value,
                                                            0
                                                        );



                                                const reachedTotal =
                                                    Object.values(subtotalReached)
                                                        .reduce(
                                                            (sum, value) =>
                                                                sum + value,
                                                            0
                                                        );



                                                const targetTotal =
                                                    quarterMonths[month]
                                                        .reduce(
                                                            (sum, m) =>
                                                                sum +
                                                                analytics.monthly[m].target,
                                                            0
                                                        );



                                                const maleTotal =
                                                    quarterMonths[month]
                                                        .reduce(
                                                            (sum, m) =>
                                                                sum +
                                                                analytics.monthly[m].maleSolo,
                                                            0
                                                        );



                                                const femaleTotal =
                                                    quarterMonths[month]
                                                        .reduce(
                                                            (sum, m) =>
                                                                sum +
                                                                analytics.monthly[m].femaleSolo,
                                                            0
                                                        );



                                                const soloTotal =
                                                    quarterMonths[month]
                                                        .reduce(
                                                            (sum, m) =>
                                                                sum +
                                                                analytics.monthly[m].totalSolo,
                                                            0
                                                        );



                                                const coupleTotal =
                                                    quarterMonths[month]
                                                        .reduce(
                                                            (sum, m) =>
                                                                sum +
                                                                analytics.monthly[m].coupleAttendees,
                                                            0
                                                        );





                                                return (

                                                    <tr className="quarter-subtotal">


                                                        <th>

                                                            Sub-total

                                                        </th>



                                                        {categories.map(cat => (

                                                            <th key={cat}>

                                                                {subtotalClasses[cat]}

                                                            </th>

                                                        ))}




                                                        <th>

                                                            {classTotal}

                                                        </th>




                                                        <th>

                                                            {targetTotal}

                                                        </th>





                                                        {categories.map(cat => (

                                                            <th key={"r-" + cat}>

                                                                {subtotalReached[cat]}

                                                            </th>

                                                        ))}




                                                        <th>

                                                            {reachedTotal}

                                                        </th>




                                                        <th>

                                                            {maleTotal}

                                                        </th>



                                                        <th>

                                                            {femaleTotal}

                                                        </th>



                                                        <th>

                                                            {soloTotal}

                                                        </th>



                                                        <th>

                                                            {coupleTotal}

                                                        </th>



                                                    </tr>

                                                );


                                            })()

                                        )}



                                    </Fragment>

                                );

                            })}


                        </tbody>

                        <tfoot>

                            <tr>

                                <th className="grand-total-title">

                                    Grand Total

                                </th>

                                {/* Classes Held */}

                                {categories.map(cat => (

                                    <th key={cat}>

                                        {analytics.overallClasses[cat]}

                                    </th>

                                ))}

                                <th>

                                    {Object.values(
                                        analytics.overallClasses
                                    ).reduce(
                                        (sum, value) => sum + value,
                                        0
                                    )}

                                </th>

                                {/* Target Couples */}

                                <th>

                                    {coupleAttendees}

                                </th>

                                {/* Individuals Reached */}

                                {categories.map(cat => (

                                    <th key={"r" + cat}>

                                        {analytics.overallReached[cat]}

                                    </th>

                                ))}

                                <th>

                                    {totalParticipants}

                                </th>

                                {/* Solo / Couple */}

                                <th>

                                    {maleSolo}

                                </th>

                                <th>

                                    {femaleSolo}

                                </th>

                                <th>

                                    {totalSolo}

                                </th>

                                <th>

                                    {coupleAttendees}

                                </th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default FormAAnalytics;