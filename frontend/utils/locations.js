// utils/locations.js

// Define the list of valid areas in Israel
const Areas = [
    'ערבה',
    'נגב',
    'ים המלח',
    'מרכז', // Includes Jerusalem according to common grouping, adjust if needed
    'עמקים', // Includes Jezreel, Jordan valleys etc.
    'חיפה', // Haifa district
    'גליל וגולן', // Galilee and Golan Heights
    'אחר' // Catch-all / Other category
];

// Define a map of settlements associated with each area
// NOTE: This is a sample list. You should expand this significantly
// with the actual settlements relevant to your service area.
const settlementMap = {
    'ערבה': ['אילת', 'יטבתה', 'פארן', 'קטורה', 'אליפז', 'אחר'],
    'נגב': ['באר שבע', 'דימונה', 'ערד', 'מצפה רמון', 'ירוחם', 'נתיבות', 'אופקים', 'שדרות', 'אחר'],
    'ים המלח': ['עין גדי', 'נווה זוהר', 'ורד יריחו', 'מצפה שלם', 'אחר'],
    'מרכז': ['תל אביב-יפו', 'ירושלים', 'ראשון לציון', 'פתח תקווה', 'חולון', 'רמת גן', 'גבעתיים', 'בת ים', 'בני ברק', 'רחובות', 'נס ציונה', 'לוד', 'רמלה', 'מודיעין-מכבים-רעות', 'אחר'],
    'עמקים': ['עפולה', 'בית שאן', 'טבריה', 'מגדל העמק', 'יקנעם עילית', 'נצרת', 'נצרת עילית (נוף הגליל)', 'אחר'],
    'חיפה': ['חיפה', 'חדרה', 'קרית אתא', 'נשר', 'טירת כרמל', 'קרית ים', 'קרית ביאליק', 'קרית מוצקין', 'זכרון יעקב', 'אור עקיבא', 'אחר'],
    'גליל וגולן': ['צפת', 'קצרין', 'קרית שמונה', 'כרמיאל', 'נהריה', 'עכו', 'מעלות-תרשיחא', 'שלומי', 'אחר'],
    'אחר': ['בבקשה צרף כתובת מלאה בשורת הכתיבה'] // For cases where area doesn't fit or isn't specified
};

// Export the data for use in other modules
module.exports = {
    Areas,
    settlementMap
};

// If using ES Modules (e.g., in standard frontend React/Next.js):
// export { Areas, settlementMap };
