import axios from 'axios'
import cors from 'cors'
import express from 'express'
import { point, booleanPointInPolygon } from '@turf/turf';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express()
app.use(express.json({ limit: '50mb' }))
// app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const countryBoundariesPath = path.join(__dirname, 'countries.geojson')
let allCountryBoundaries = {}
let allStores = []

const loadCountryBoundaries = () => {
    if (fs.existsSync(countryBoundariesPath)) {
        allCountryBoundaries = JSON.parse(fs.readFileSync(countryBoundariesPath, 'utf8'));
    } else {
        console.error('Country boundaries file not found.')
    }
}

// Load the data when the server starts
loadCountryBoundaries()


if (process.env.NODE_ENV !== 'production') {
    const corsOptions = {
        origin: [
            'http://127.0.0.1:3000',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://localhost:5173'
        ],
        credentials: true
    };
    app.use(cors(corsOptions));
}


app.get('/stores', async (req, res) => {
    try {
        const { data } = await axios.get('https://raw.githubusercontent.com/mmcloughlin/starbucks/master/locations.json')
        allStores = data
        res.json(data)
    } catch (error) {
        console.error('Error fetching store locations:', error)
        res.status(500).json({ error: 'Failed to fetch store locations' })
    }
})

//FILTER MULTIPLE STORES WITHIN COUNTRY BOUNDARIES
app.post('/filter-stores', async (req, res) => {
    const { countryCode } = req.body
    if (!allStores || !countryCode || countryCode.length !== 2) {
        return res.status(400).json({ error: 'Missing stores or countryCode' })
    }

    try {
        const countryBoundaries = getCountryBoundariesByCode(countryCode)

        if (!countryBoundaries) {
            return res.status(404).json({ error: 'Country boundaries not found' })
        }

        const filteredStores = allStores.filter(store => {
            const pointLocation = point([store.longitude, store.latitude])
            return booleanPointInPolygon(pointLocation, countryBoundaries)
        })

        res.json({ filteredStores, countryBoundaries })
    } catch (error) {
        console.error('error:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

function getCountryBoundariesByCode(countryCode) {
    //ISO_A2 is 2 letter code
    const countryDetails = allCountryBoundaries?.features.find(country => country.properties.ISO_A2 === countryCode)

    if (!countryDetails) {
        console.error('Couldn\'t find country boundaries for:', countryCode)
        return null
    }

    return {
        type: countryDetails.geometry.type,
        coordinates: countryDetails.geometry.coordinates
    }
}

const port = process.env.PORT || 3030
app.listen(port, () => {
    console.log('Server is running on port: ' + port)
})