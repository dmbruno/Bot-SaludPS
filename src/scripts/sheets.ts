import dotenv from 'dotenv';
import * as fs from 'fs';
import { google, sheets_v4 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { GoogleAuth } from 'google-auth-library';

import path from 'path';
dotenv.config();


const googleCredentials = JSON.parse(process.env.GOOGLE_JSON);

if (!googleCredentials) {
    throw new Error('Google credentials not found');
}
const googleJsonPath = path.join(process.cwd(), 'google.json');

if (!fs.existsSync(googleJsonPath)) {
    try {
        fs.writeFileSync(googleJsonPath, JSON.stringify(googleCredentials, null, 2));
    } catch (error) {
        throw new Error(`Error al escribir el archivo google.json ${error.message}`);
    }
} else {
    console.log('El archivo google.json ya existe');

}

const auth = new GoogleAuth({
    keyFile: './google.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})


console.log('GoogleAuth module loaded successfully:', GoogleAuth);
const spreadsheetsId = process.env.SPREADSHEETID;

/**
 * Función para escribir valores en Google Sheets
 */
async function writeToSheet(
    values: any[][],
    range: string
): Promise<GaxiosResponse<sheets_v4.Schema$UpdateValuesResponse> | void> {
    const sheets = google.sheets({ version: 'v4', auth });
    const valueInputOption = 'USER_ENTERED';

    const resource = {
        values,
    };
    try {
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetsId,
            range,
            valueInputOption,
            requestBody: resource,
        });
        return res;
    } catch (error) {
        console.error('Error al escribir en la hoja:', error);
    }
}

/**
 * Función para leer valores de Google Sheets
 */
async function readSheet(range: string): Promise<any[][] | void> {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetsId,
            range,
        });
        const rows = response.data.values;
        return rows;
    } catch (error) {
        console.error('Error al leer la hoja:', error);
    }
}

/**
 * Función para leer todos los slots disponibles de Google Sheets
 */
const getAvailableSlots = async (): Promise<any[][]> => {
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetsId,
            range: `Sheet1!A2:G`,
        });

        const rows = response.data.values || [];

        return rows;
    } catch (error) {
        console.error('Error al leer los slots disponibles:', error);
        return [];
    }
};

/**
 * Función para asignar un turno en Google Sheets
 */
const assignSlot = async (
    date: string,
    startTime: string,
    patientName: string,
    telefono: string
): Promise<void> => {
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetsId,
            range: `Sheet1!A2:G`,
        });

        const rows = response.data.values || [];
        const formattedDate = date.trim().toLowerCase();
        const formattedStartTime = startTime.trim().toLowerCase();

        const rowIndex = rows.findIndex((row) => {
            return (
                row[1].trim().toLowerCase() === formattedDate &&
                row[2].trim().toLowerCase() === formattedStartTime &&
                row[4].trim().toLowerCase() === 'disponible'
            );
        });

        if (rowIndex === -1) {
            console.error('Turno no encontrado o ya no está disponible.');
            return;
        }

        rows[rowIndex][4] = 'Reservado';
        rows[rowIndex][5] = patientName;
        rows[rowIndex][6] = telefono;

        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetsId,
            range: `Sheet1!A${rowIndex + 2}:G${rowIndex + 2}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rows[rowIndex]],
            },
        });

        console.log('Turno asignado exitosamente.');
    } catch (error) {
        console.error('Error al asignar el turno:', error);
    }
};

export { writeToSheet, readSheet, getAvailableSlots, assignSlot };