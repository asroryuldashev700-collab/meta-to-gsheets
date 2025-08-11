require("dotenv").config()
const axios = require("axios")
const { GoogleSpreadsheet } = require("google-spreadsheet")
const { JWT } = require("google-auth-library")

const { AD_ACCOUNT_ID, ACCESS_TOKEN } = process.env

function getTimeRange() {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const since = firstDay.toISOString().split('T')[0];
    const until = now.toISOString().split('T')[0]

    return { since, until };
}

async function getData() {
    try {
        const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights`

        const { since, until } = getTimeRange()

        const params = {
            fields: 'spend',
            time_range: JSON.stringify({ since, until }),
            access_token: ACCESS_TOKEN
        }

        const { data } = await axios.get(url, { params })

        return data.data[0]
    } catch (err) {
        if (err.reponse) {
            console.error('API Error:', err.response.data)
        } else {
            console.error('Request Error:', err.message)
        }
    }
}

async function sendToGoogleSheets(data) {
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const doc = new GoogleSpreadsheet(`${process.env.GOOGLE_SHEET_ID}`, serviceAccountAuth)

        await doc.loadInfo()
        
        const sheet = doc.sheetsByIndex[0]

        await sheet.setHeaderRow(['Timestamp', 'Spent'])

        await sheet.addRow({
            Timestamp: new Date().toISOString(),
            Spent: data.spend
        })

        console.log("✅ Data sent to Google Sheets")
    } catch (err) {
        console.error("Failed to send to Google Sheets:", err)
    }
}

(async () => {
    const data = await getData()
    console.log("Data:", data)

    await sendToGoogleSheets(data)
})()