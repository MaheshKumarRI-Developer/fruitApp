const fs = require('fs');

const inputFile = 'c:\\Users\\thiru\\Downloads\\FoodData_Central_foundation_food_json_2026-04-30.json';
const outputFile = 'c:\\Users\\thiru\\Downloads\\fruits_data.json';

console.log('Reading JSON file...');
const rawData = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(rawData);

console.log('Filtering for fruits...');
const fruits = [];

for (const item of data.FoundationFoods || []) {
    let isFruit = false;
    
    // Check foodCategory
    if (item.foodCategory && item.foodCategory.description && item.foodCategory.description.toLowerCase().includes('fruit')) {
        isFruit = true;
    }
    
    if (isFruit) {
        fruits.push(item);
        if (fruits.length >= 25) { // maximum 20 to 30
            break;
        }
    }
}

console.log(`Found ${fruits.length} fruits. Writing to output file...`);
fs.writeFileSync(outputFile, JSON.stringify(fruits, null, 2), 'utf-8');
console.log('Done! Saved to ' + outputFile);
