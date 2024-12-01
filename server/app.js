'use strict';

const express = require('express');
const app = express();
require('dotenv').config();
require('express-async-errors');
const { Band, Musician, Instrument } = require('./db/models');
const { Op } = require('sequelize');

app.use(express.json());

app.get('/musicians', async (req, res, next) => {
    let query = { where: {}, include: [] };

    // Pagination
    const page = req.query.page === undefined ? 1 : parseInt(req.query.page);
    const size = req.query.size === undefined ? 5 : parseInt(req.query.size);
    if (page >= 1 && size >= 1) {
        query.limit = size;
        query.offset = size * (page - 1);
    }

    // Filters
    if (req.query.firstName) {
        query.where.firstName = { [Op.iLike]: `%${req.query.firstName}%` };
    }
    if (req.query.lastName) {
        query.where.lastName = { [Op.iLike]: `%${req.query.lastName}%` };
    }

    if (req.query.bandName) {
        query.include.push({
            model: Band,
            where: { name: { [Op.iLike]: `%${req.query.bandName}%` } },
            required: true
        });
    }

    if (req.query.instrumentTypes) {
        const instrumentTypes = Array.isArray(req.query.instrumentTypes)
            ? req.query.instrumentTypes
            : [req.query.instrumentTypes];
        query.include.push({
            model: Instrument,
            where: { type: { [Op.in]: instrumentTypes } },
            through: { attributes: [] } // Omits join table
        });
    }

    // Attributes
    if (req.query.musicianFields) {
        query.attributes = req.query.musicianFields.includes('all')
            ? undefined
            : req.query.musicianFields.includes('none')
            ? []
            : req.query.musicianFields;
    }

    if (req.query.bandFields || req.query.instrumentFields) {
        query.include.forEach((include) => {
            if (include.model === Band) {
                include.attributes = req.query.bandFields.includes('all')
                    ? undefined
                    : req.query.bandFields.includes('none')
                    ? []
                    : req.query.bandFields;
            }
            if (include.model === Instrument) {
                include.attributes = req.query.instrumentFields.includes('all')
                    ? undefined
                    : req.query.instrumentFields.includes('none')
                    ? []
                    : req.query.instrumentFields;
            }
        });
    }

    // Order
    if (req.query.order) {
        query.order = req.query.order.map((param) => {
            const [field, direction] = param.split(',');
            return direction ? [field, direction.toUpperCase()] : [field];
        });
    } else {
        query.order = [['lastName', 'ASC'], ['firstName', 'ASC']];
    }

    // Execute query
    const musicians = await Musician.findAndCountAll(query);
    res.json(musicians);
});

app.get('/', (req, res) => {
    res.json({ message: "API server is running" });
});

const port = 5000;
app.listen(port, () => console.log('Server is listening on port', port));

