import { useMemo } from "react";
import "./FormBAnalytics.css";


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


function getFieldValue(client, keys) {

    for (const key of keys) {

        const value = client?.[key];


        if (
            value === undefined ||
            value === null
        ) continue;


        if (typeof value === "string") {

            if (value.trim()) {

                return value.trim();

            }

        }

        else {

            return value;

        }

    }


    return "";

}



function normalize(value) {

    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";

}



function getMonth(client) {


    const value =
        getFieldValue(client, [

            "month",
            "report_month",
            "created_at",
            "updated_at",
            "date"

        ]);



    if (!value) return "";



    // Firebase Timestamp

    if (value?.toDate) {

        const date =
            value.toDate();

        return monthNames[
            date.getMonth()
        ];

    }



    const date =
        new Date(value);



    if (!isNaN(date)) {

        return monthNames[
            date.getMonth()
        ];

    }



    const text =
        String(value)
            .toLowerCase();



    return (

        monthNames.find(month =>

            text.includes(
                month.toLowerCase()
            )

        )

        || ""

    );


}




function FormBAnalytics({

    clients = [],

    loading = false,

    error = "",

}) {



    const analytics = useMemo(() => {


        let unmetNeed = 0;

        let referredServed = 0;



        let traditionalNoShift = 0;

        let traditionalShift = 0;

        let traditionalReferred = 0;



        const monthly = {};



        monthNames.forEach(month => {


            monthly[month] = {


                unmet: 0,


                referred: 0,


                traditional: 0,


                traditionalNoShift: 0,


                traditionalShift: 0,


                total: 0,


            };


        });




        const traditionalMethods = [


            "withdrawal",

            "calendar",

            "rhythm",

            "bbt",

            "billings",

            "ccm",

            "lam",

            "sdm",

            "sympto",


        ];





        clients.forEach(client => {


            const method =

                normalize(

                    getFieldValue(
                        client,
                        [
                            "fp_method",
                            "method",
                        ]
                    )

                );



            const intention =

                normalize(

                    getFieldValue(
                        client,
                        [
                            "intention_to_shift"
                        ]
                    )

                );




            const month =
                getMonth(client);




            const isTraditional =

                traditionalMethods.some(
                    item =>
                        method.includes(item)
                );






            /*
                COUPLES WITH UNMET NEED
            */


            if (!method) {


                unmetNeed++;


                if (month) {

                    monthly[month]
                        .unmet++;

                }


            }






            /*
                REFERRED / SERVED
    
                Requires parent fetch to add:
    
                sourceCollection:"clients_referred"
    
            */


            if (
                client.sourceCollection ===
                "clients_referred"
            ) {


                referredServed++;



                if (month) {

                    monthly[month]
                        .referred++;

                }


            }






            /*
                TRADITIONAL FP USERS
            */


            if (isTraditional) {


                traditionalReferred++;



                if (month) {


                    monthly[month]
                        .traditional++;




                    if (intention) {


                        traditionalShift++;


                        monthly[month]
                            .traditionalShift++;


                    }


                    else {


                        traditionalNoShift++;


                        monthly[month]
                            .traditionalNoShift++;


                    }



                }



            }



            if (month) {

                monthly[month]
                    .total++;

            }



        });




        return {


            unmetNeed,


            referredServed,


            traditionalNoShift,


            traditionalShift,


            traditionalReferred,


            monthly,


        };



    }, [clients]);




    if (loading) {

        return (

            <div className="form-b-loading">

                Loading Form B...

            </div>

        );

    }



    if (error) {

        return (

            <div className="form-b-loading">

                {error}

            </div>

        );

    }



    return (

        <div className="form-b-container">



            {/* ==========================
    KPI CARDS
========================== */}


            <div className="form-b-cards">



                <div className="fb-card green">


                    <small>

                        Couples with Unmet Need

                    </small>


                    <h2>

                        {analytics.unmetNeed}

                    </h2>


                </div>





                <div className="fb-card orange">


                    <small>

                        Traditional FP Users

                    </small>


                    <h2>

                        {analytics.traditionalReferred}

                    </h2>


                </div>





                <div className="fb-card blue">


                    <small>

                        Clients Referred / Served

                    </small>


                    <h2>

                        {analytics.referredServed}

                    </h2>


                </div>





                <div className="fb-card red">


                    <small>

                        Total Unmet Need

                    </small>


                    <h2>

                        {analytics.unmetNeed}

                    </h2>


                </div>



            </div>







            {/* ==========================
    SUMMARY GRID
========================== */}



            <div className="summary-grid">





                {/* UNMET NEED */}



                <div className="summary-panel">


                    <h3>

                        Unmet Need Breakdown

                    </h3>




                    <div className="summary-row">


                        <span>

                            Couples with Unmet Need

                        </span>



                        <strong>

                            {analytics.unmetNeed}

                        </strong>


                    </div>





                    <div className="summary-row">


                        <span>

                            Clients Referred / Served

                        </span>



                        <strong>

                            {analytics.referredServed}

                        </strong>


                    </div>



                </div>









                {/* TRADITIONAL FP */}



                <div className="summary-panel">


                    <h3>

                        Traditional FP Summary

                    </h3>





                    <div className="summary-row">


                        <span>

                            Without Intention to Shift

                        </span>



                        <strong>

                            {analytics.traditionalNoShift}

                        </strong>


                    </div>





                    <div className="summary-row">


                        <span>

                            With Intention to Shift

                        </span>



                        <strong>

                            {analytics.traditionalShift}

                        </strong>


                    </div>





                    <div className="summary-row">


                        <span>

                            Traditional FP Users

                        </span>



                        <strong>

                            {analytics.traditionalReferred}

                        </strong>


                    </div>




                </div>









                {/* OVERALL */}



                <div className="summary-panel">


                    <h3>

                        Overall Summary

                    </h3>





                    <div className="summary-row">


                        <span>

                            Total Unmet Need

                        </span>



                        <strong>

                            {analytics.unmetNeed}

                        </strong>


                    </div>





                    <div className="summary-row">


                        <span>

                            Total Clients Referred

                        </span>



                        <strong>

                            {analytics.referredServed}

                        </strong>


                    </div>



                </div>




            </div>

            {/* ================================
    MONTHLY SUMMARY
================================ */}


            <div className="monthly-summary">


                <h3>

                    Monthly Summary

                </h3>




                <table className="monthly-summary-table">


                    <thead>


                        <tr>


                            <th>

                                Month

                            </th>


                            <th>

                                Unmet Need

                            </th>


                            <th>

                                Referred / Served

                            </th>


                            <th>

                                Traditional FP Users

                            </th>


                            <th>

                                Without Shift

                            </th>


                            <th>

                                With Shift

                            </th>


                        </tr>


                    </thead>





                    <tbody>


                        {

                            monthNames.map(month => (


                                <tr key={month}>


                                    <td>

                                        {month}

                                    </td>



                                    <td>

                                        {analytics.monthly[month].unmet}

                                    </td>




                                    <td>

                                        {analytics.monthly[month].referred}

                                    </td>




                                    <td>

                                        {analytics.monthly[month].traditional}

                                    </td>




                                    <td>

                                        {analytics.monthly[month].traditionalNoShift}

                                    </td>




                                    <td>

                                        {analytics.monthly[month].traditionalShift}

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

                                {analytics.unmetNeed}

                            </th>



                            <th>

                                {analytics.referredServed}

                            </th>



                            <th>

                                {analytics.traditionalReferred}

                            </th>



                            <th>

                                {analytics.traditionalNoShift}

                            </th>



                            <th>

                                {analytics.traditionalShift}

                            </th>



                        </tr>


                    </tfoot>


                </table>



            </div>







            {/* ================================
    OFFICIAL FORM B REPORT
================================ */}



            <div className="official-report">



                <div className="official-header">



                    <div>


                        <h2>

                            Official Form B Report

                        </h2>


                        <p>

                            Responsible Parenthood and Family Planning

                        </p>


                    </div>





                    <div className="report-buttons">


                        <button className="refresh-btn">

                            ⟳ Refresh Data

                        </button>



                        <button className="pdf-btn">

                            Export PDF

                        </button>




                        <button className="excel-btn">

                            Export Excel

                        </button>



                    </div>




                </div>







                <div className="official-table-wrapper">



                    <table className="official-table">



                        <thead>


                            <tr>


                                <th rowSpan="2" id="month-header">

                                    Month

                                </th>



                                <th rowSpan="2">

                                    No. of couples with unmet need
                                    <br />
                                    for Modern FP

                                </th>



                                <th rowSpan="2">

                                    No. of Clients with unmet need
                                    <br />
                                    for Modern FP referred / served

                                </th>



                                <th colSpan="2">

                                    No. of couples who are currently
                                    <br />
                                    using Traditional FP

                                </th>



                                <th rowSpan="2">

                                    No. of Clients currently using
                                    <br />
                                    Traditional FP referred / served

                                </th>



                                <th rowSpan="2">

                                    Total No. of
                                    <br />
                                    Unmet Need

                                </th>



                                <th rowSpan="2">

                                    Total No. of Clients
                                    <br />
                                    referred / served

                                </th>


                            </tr>





                            <tr>



                                <th>

                                    Without intention
                                    <br />
                                    to shift

                                </th>



                                <th>

                                    With intention
                                    <br />
                                    to shift

                                </th>



                            </tr>


                        </thead>






                        <tbody>



                            {

                                monthNames.map(month => {


                                    const row =
                                        analytics.monthly[month];



                                    return (


                                        <tr key={month}>


                                            <td>

                                                {month}

                                            </td>




                                            <td>

                                                {row.unmet}

                                            </td>





                                            <td>

                                                {row.referred}

                                            </td>





                                            <td>

                                                {row.traditionalNoShift}

                                            </td>





                                            <td>

                                                {row.traditionalShift}

                                            </td>





                                            <td>

                                                {row.traditional}

                                            </td>





                                            <td>

                                                {row.unmet}

                                            </td>





                                            <td>

                                                {row.referred}

                                            </td>





                                        </tr>



                                    );


                                })

                            }



                        </tbody>

                        <tfoot>


                            <tr>


                                <th className="grand-total-title">

                                    GRAND TOTAL

                                </th>





                                <th>

                                    {analytics.unmetNeed}

                                </th>





                                <th>

                                    {analytics.referredServed}

                                </th>





                                <th>

                                    {analytics.traditionalNoShift}

                                </th>





                                <th>

                                    {analytics.traditionalShift}

                                </th>





                                <th>

                                    {analytics.traditionalReferred}

                                </th>





                                <th>

                                    {analytics.unmetNeed}

                                </th>





                                <th>

                                    {analytics.referredServed}

                                </th>



                            </tr>



                        </tfoot>



                    </table>



                </div>



            </div>



        </div>



    );


}



export default FormBAnalytics;