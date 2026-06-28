const db = require('./config/db');

async function seed() {
  const categories = ['Laptop', 'Camera', 'Drone', 'Tablet'];
  let count = 0;
  
  for(let i=0; i<50; i++) {
    const cat = categories[i % categories.length];
    const name = `${cat} Model X${Math.floor(Math.random()*1000)}`;
    const serial = `NEW-${Math.floor(Math.random()*100000)}`;
    const cost = 2000 + Math.floor(Math.random()*8000);
    
    await db.query(
      `INSERT INTO devices (device_name, category, serial_number, purchase_cost, status) VALUES ($1, $2, $3, $4, 'Available')`,
      [name, cat, serial, cost]
    );
    count++;
  }
  
  console.log(`Successfully added ${count} available devices.`);
  process.exit(0);
}

seed().catch(console.error);
