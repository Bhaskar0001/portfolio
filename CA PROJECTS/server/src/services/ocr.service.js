const Tesseract = require('tesseract.js');
// Fixing ReferenceError: DOMMatrix is not defined in Node 20+ for pdf-parse
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}
const pdf = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const env = require('../config/env');

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * OCR Service for NoticeRadar
 * Handles text extraction from Images and PDFs
 */
const ocrService = {
    /**
     * Extract text from a file (Image or PDF)
     * @param {string} filePath - Path to the local file
     * @param {string} mimeType - File mime type
     */
    async extractText(filePath, mimeType) {
        try {
            if (mimeType === 'application/pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                return data.text;
            } else if (mimeType.startsWith('image/')) {
                const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
                return text;
            } else {
                throw new Error('Unsupported file type for OCR');
            }
        } catch (error) {
            console.error('OCR Extraction Error:', error);
            throw error;
        }
    },

    /**
     * Parse extracted text to find key notice fields
     * Uses Regex patterns tailored for Income Tax / GST notices
     */
    async parseNoticeFields(text) {
        if (openai) {
            try {
                const response = await openai.chat.completions.create({
                    model: env.OPENAI_MODEL || "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are a specialized legal and tax document parser for Indian CA firms. Extract notice details in strict JSON format."
                        },
                        {
                            role: "user",
                            content: `Extract fields from this text:
                            - noticeNumber (DIN or ID)
                            - pan (10 char alphanumeric)
                            - section (e.g. 143(1))
                            - dueDate (DD/MM/YYYY)
                            - assessmentYear (e.g. 2024-25)
                            - category ("Income Tax", "GST", or "Other")
                            
                            Text: ${text.substring(0, 10000)}`
                        }
                    ],
                    response_format: { type: "json_object" }
                });

                const result = JSON.parse(response.choices[0].message.content);
                return result;
            } catch (err) {
                console.warn('OpenAI Extraction failed, falling back to Regex:', err.message);
            }
        }
        return this.parseNoticeFieldsRegex(text);
    },

    parseNoticeFieldsRegex(text) {
        const fields = {
            noticeNumber: null,
            pan: null,
            section: null,
            dueDate: null,
            assessmentYear: null,
            category: 'General'
        };

        // 1. Extract PAN (Standard 10 char alphanumeric)
        const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
        if (panMatch) fields.pan = panMatch[0];

        // 2. Extract Document Identification Number (DIN - Income Tax)
        // Format usually like: ITBA/AST/S/143(2)/2023-24/105...
        const dinMatch = text.match(/(ITBA\/[A-Z0-9\/()-]+)/i);
        if (dinMatch) {
            fields.noticeNumber = dinMatch[0];
            fields.category = 'Income Tax';
        }

        // 3. Extract Assessment Year
        const ayMatch = text.match(/A\.Y\.?\s*([0-9]{4}-[0-9]{2,4})/i);
        if (ayMatch) fields.assessmentYear = ayMatch[1];

        // 4. Extract Section (e.g. 143(2), 148, 142(1), 73, 74)
        const sectionMatch = text.match(/section\s*([0-9]{2,3}\(?[0-9]*\)?[A-Z]?)/i);
        if (sectionMatch) fields.section = sectionMatch[1];

        // 5. Extract Due Date / Compliance Date
        // Format: DD/MM/YYYY or DD-MM-YYYY
        const dateMatches = text.match(/([0-3][0-9][\/\-.][0-1][0-9][\/\-.][2][0][2-3][0-9])/g);
        if (dateMatches && dateMatches.length > 0) {
            // Usually the last date mentioned in the compliance context is the due date
            // or we pick the one furthest in the future as a heuristic
            fields.dueDate = dateMatches[0];
        }

        // 6. GST Category detection
        if (text.toLowerCase().includes('gst') || text.toLowerCase().includes('good and services tax')) {
            fields.category = 'GST';
            // GST Notice Number (ARN/Reference)
            const gstRef = text.match(/(ZD[0-9]{13,})/i);
            if (gstRef && !fields.noticeNumber) fields.noticeNumber = gstRef[0];
        }

        return fields;
    }
};

module.exports = ocrService;
