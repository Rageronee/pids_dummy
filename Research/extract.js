const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const targetDir = './';
const outputDir = path.join(targetDir, 'extracted_text');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(targetDir);

async function processFiles() {
    for (const file of files) {
        const filePath = path.join(targetDir, file);
        const ext = path.extname(file).toLowerCase();
        const basename = path.basename(file, ext);
        if (ext === '.pdf') {
            try {
                console.log(`Processing PDF: ${file}`);
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                fs.writeFileSync(path.join(outputDir, `${basename}.txt`), data.text);
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        } else if (ext === '.docx') {
            try {
                console.log(`Processing DOCX: ${file}`);
                const result = await mammoth.extractRawText({ path: filePath });
                fs.writeFileSync(path.join(outputDir, `${basename}.txt`), result.value);
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }
    }
    console.log('Extraction complete.');
}

processFiles();
