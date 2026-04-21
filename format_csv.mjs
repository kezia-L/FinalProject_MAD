import fs from 'fs';
import readline from 'readline';

async function processCSV() {
    console.log("Formatting CSV headers...");
    const fileStream = fs.createReadStream('nutrition.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isFirstLine = true;
    let newContent = '';

    for await (const line of rl) {
        if (isFirstLine) {
            let header = line.trim();
            // id,calories,proteins,fat,carbohydrate,name,image
            header = header.replace('proteins', 'protein');
            header = header.replace('carbohydrate', 'carbs');
            newContent += header + '\n';
            isFirstLine = false;
        } else {
            newContent += line + '\n';
        }
    }

    fs.writeFileSync('nutrition_formatted.csv', newContent);
    console.log("CSV formatted and saved to nutrition_formatted.csv.");
}

processCSV();
