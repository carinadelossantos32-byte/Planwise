import { methodLabel } from "./reportData";

// What each FP method acronym stands for
const methodMeanings = {
    CMM: "Cervical Mucus Method",
    BBT: "Basal Body Temperature",
    STM: "Sympto-Thermal Method",
    SDM: "Standard Days Method",
    LAM: "Lactational Amenorrhea Method",
    IUD: "Intrauterine Device",
    NSV: "No-Scalpel Vasectomy",
    BTL: "Bilateral Tubal Ligation",
};

/*
    A method name for the method cards. Acronyms get their meaning on a small
    line underneath; plain names (Pills, Condom...) are shown as they are.
    Only the cards use this - the tables keep the short names.
*/
function MethodName({ name }) {

    const label = methodLabel(name);
    const meaning = methodMeanings[label];

    return (
        <>
            {label}
            {meaning && <small className="method-meaning">{meaning}</small>}
        </>
    );
}

export default MethodName;
