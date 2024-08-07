import axios from 'axios'
import cors from 'cors'
import express from 'express'
import { point, booleanPointInPolygon } from '@turf/turf';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express()
app.use(express.json())

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const countryBoundariesPath = path.join(__dirname, 'countries.geojson');
let allCountryBoundaries = {};

const loadCountryBoundaries = () => {
    if (fs.existsSync(countryBoundariesPath)) {
        allCountryBoundaries = JSON.parse(fs.readFileSync(countryBoundariesPath, 'utf8'));
    } else {
        console.error('Country boundaries file not found.');
    }
};

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

app.post('/check-location', async (req, res) => {
    const { coordinates, countryCode } = req.body
    console.log('req.body:', req.body)
    if (!coordinates || !countryCode || countryCode.length !== 2) {
        return res.status(400).json({ error: 'Missing coordinates or countryCode' });
    }

    try {
        const countryBoundaries = await getCountryBoundariesByCode(countryCode)

        if (!countryBoundaries) {
            return res.status(404).json({ error: 'Country not found' })
        }

        const pointLocation = point(coordinates)
        const isInside = booleanPointInPolygon(pointLocation, countryBoundaries)
        console.log('isInside:', isInside)
        res.json({ isInside })
    } catch (error) {
        console.log('error:', error)
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

async function getCountryBoundariesByCode(countryCode) {
    console.log('countryCode:', countryCode)
    try {
        const countryDetails = allCountryBoundaries?.features.find(country => country.properties.ISO_A2 === countryCode)

        if (!countryDetails) {
            console.error('Couldn\'t find country boundaries for:', countryCode)
            return null
        }

        const boundaries = {
            type: countryDetails.geometry.type,
            coordinates: countryDetails.geometry.coordinates
        }

        return boundaries
    } catch (error) {
        console.error('Error getting country boundaries:', error)
        return null
    }

}

const port = process.env.PORT || 3030
app.listen(port, () => {
    console.log('Server is running on port: ' + port)
})