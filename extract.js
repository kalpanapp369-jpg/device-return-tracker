const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\LEN CPIN\\.gemini\\antigravity\\brain\\02c388c0-18e7-4c1a-a7f3-1ca3681810a6\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let htmlContent = "";
  let insideLogisticsView = false;
  let linesCaptured = 0;

  for await (const line of rl) {
    if (line.includes('logistics.html') && line.includes('Total Lines:')) {
      const parsed = JSON.parse(line);
      const content = parsed.content || JSON.stringify(parsed);
      if (content.includes('Showing lines 1 to 100')) {
         // this is the first chunk of logistics.html
         // We extract the actual lines
         let rawOutput = parsed.tool_calls?.[0]?.output || parsed.content;
         if (rawOutput && rawOutput.includes('The following code has been modified to include a line number')) {
           fs.writeFileSync('logistics1.txt', rawOutput);
         }
      }
      if (content.includes('Showing lines 100 to 200') || content.includes('Showing lines 170 to 220')) {
         let rawOutput = parsed.tool_calls?.[0]?.output || parsed.content;
         if (rawOutput && rawOutput.includes('The following code has been modified to include a line number')) {
           fs.writeFileSync('logistics2.txt', rawOutput);
         }
      }
    }
  }
}
run();
