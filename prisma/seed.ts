import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import "dotenv/config";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let prisma: PrismaClient;
if (tursoUrl && tursoToken) {
  const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
  prisma = new PrismaClient({ adapter });
} else {
  const localUrl = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaLibSql({ url: localUrl });
  prisma = new PrismaClient({ adapter });
}

async function main() {
  // Seed Settings
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Manny Source Electric Corp",
      address: "3932 SW 160th St, Miami, FL 33177",
      phone: "(786) 299-2168",
      license: "ER13016064",
      email: "",
      website: "mannysourceelectric.com",
      defaultLaborRate: 65.0,
      defaultOverhead: 0.15,
      defaultProfit: 0.10,
      taxRate: 0,
      defaultTerms:
        "Payment terms: Net 30. This estimate is valid for 30 days from the date of issue. All work performed in accordance with the National Electrical Code (NEC) and Florida Building Code (FBC). Permit fees not included unless specified. Manny Source Electric Corp — FL License #22E000394 / ER13016064.",
    },
  });

  // Seed Materials
  const materials = [
    // Wire
    { name: "12 AWG THHN (500ft)", sku: "THHN-12", category: "Wire", unit: "roll", unitPrice: 89.97 },
    { name: "10 AWG THHN (500ft)", sku: "THHN-10", category: "Wire", unit: "roll", unitPrice: 139.00 },
    { name: "8 AWG THHN (500ft)", sku: "THHN-8", category: "Wire", unit: "roll", unitPrice: 219.00 },
    { name: "6 AWG THHN (500ft)", sku: "THHN-6", category: "Wire", unit: "roll", unitPrice: 329.00 },
    { name: "4 AWG THHN (per ft)", sku: "THHN-4", category: "Wire", unit: "ft", unitPrice: 1.85 },
    { name: "2 AWG THHN (per ft)", sku: "THHN-2", category: "Wire", unit: "ft", unitPrice: 2.65 },
    { name: "1/0 THHN (per ft)", sku: "THHN-1/0", category: "Wire", unit: "ft", unitPrice: 4.25 },
    { name: "14/2 Romex NM-B (250ft)", sku: "NM-14-2", category: "Wire", unit: "roll", unitPrice: 74.97 },
    { name: "12/2 Romex NM-B (250ft)", sku: "NM-12-2", category: "Wire", unit: "roll", unitPrice: 89.97 },
    { name: "10/3 Romex NM-B (125ft)", sku: "NM-10-3", category: "Wire", unit: "roll", unitPrice: 119.00 },

    // Conduit
    { name: '3/4" EMT Conduit (10ft)', sku: "EMT-075", category: "Conduit", unit: "each", unitPrice: 5.48 },
    { name: '1" EMT Conduit (10ft)', sku: "EMT-100", category: "Conduit", unit: "each", unitPrice: 8.98 },
    { name: '1-1/4" EMT Conduit (10ft)', sku: "EMT-125", category: "Conduit", unit: "each", unitPrice: 13.48 },
    { name: '1-1/2" EMT Conduit (10ft)', sku: "EMT-150", category: "Conduit", unit: "each", unitPrice: 16.98 },
    { name: '2" EMT Conduit (10ft)', sku: "EMT-200", category: "Conduit", unit: "each", unitPrice: 22.48 },
    { name: '3/4" PVC Sch40 Conduit (10ft)', sku: "PVC-075", category: "Conduit", unit: "each", unitPrice: 3.98 },
    { name: '1" PVC Sch40 Conduit (10ft)', sku: "PVC-100", category: "Conduit", unit: "each", unitPrice: 5.48 },
    { name: '3/4" Liquid Tight Flex (25ft)', sku: "LT-075", category: "Conduit", unit: "roll", unitPrice: 24.98 },
    { name: '1" Liquid Tight Flex (25ft)', sku: "LT-100", category: "Conduit", unit: "roll", unitPrice: 34.98 },

    // Panels & Breakers
    { name: "200A Main Breaker Panel 40-Space", sku: "PNL-200", category: "Panels & Breakers", unit: "each", unitPrice: 289.00 },
    { name: "100A Sub Panel 20-Space", sku: "PNL-100", category: "Panels & Breakers", unit: "each", unitPrice: 149.00 },
    { name: "20A Single Pole Breaker", sku: "BRK-20SP", category: "Panels & Breakers", unit: "each", unitPrice: 6.98 },
    { name: "30A Double Pole Breaker", sku: "BRK-30DP", category: "Panels & Breakers", unit: "each", unitPrice: 12.98 },
    { name: "50A Double Pole Breaker", sku: "BRK-50DP", category: "Panels & Breakers", unit: "each", unitPrice: 16.48 },
    { name: "60A Double Pole Breaker", sku: "BRK-60DP", category: "Panels & Breakers", unit: "each", unitPrice: 18.98 },
    { name: "100A Double Pole Breaker", sku: "BRK-100DP", category: "Panels & Breakers", unit: "each", unitPrice: 42.98 },
    { name: "20A AFCI Breaker", sku: "BRK-20AFCI", category: "Panels & Breakers", unit: "each", unitPrice: 38.98 },
    { name: "20A GFCI Breaker", sku: "BRK-20GFCI", category: "Panels & Breakers", unit: "each", unitPrice: 42.98 },
    { name: "20A Dual Function AFCI/GFCI Breaker", sku: "BRK-20DF", category: "Panels & Breakers", unit: "each", unitPrice: 48.98 },

    // Devices
    { name: "20A Duplex Receptacle", sku: "DEV-REC20", category: "Devices", unit: "each", unitPrice: 1.28 },
    { name: "20A GFCI Receptacle", sku: "DEV-GFCI20", category: "Devices", unit: "each", unitPrice: 18.98 },
    { name: "Decorator Receptacle (White)", sku: "DEV-DECO", category: "Devices", unit: "each", unitPrice: 2.48 },
    { name: "Single Pole Switch", sku: "DEV-SW1", category: "Devices", unit: "each", unitPrice: 0.98 },
    { name: "3-Way Switch", sku: "DEV-SW3", category: "Devices", unit: "each", unitPrice: 3.48 },
    { name: "Dimmer Switch", sku: "DEV-DIM", category: "Devices", unit: "each", unitPrice: 22.98 },
    { name: "Occupancy Sensor Switch", sku: "DEV-OCC", category: "Devices", unit: "each", unitPrice: 24.98 },
    { name: "USB Duplex Receptacle", sku: "DEV-USB", category: "Devices", unit: "each", unitPrice: 24.98 },
    { name: "30A Dryer Receptacle (4-Prong)", sku: "DEV-DRY30", category: "Devices", unit: "each", unitPrice: 12.98 },
    { name: "50A Range Receptacle (4-Prong)", sku: "DEV-RNG50", category: "Devices", unit: "each", unitPrice: 14.98 },

    // Boxes & Fittings
    { name: '4" Square Box (1-1/2" Deep)', sku: "BOX-4SQ", category: "Boxes & Fittings", unit: "each", unitPrice: 2.18 },
    { name: '4-11/16" Square Box (2-1/8" Deep)', sku: "BOX-4-11", category: "Boxes & Fittings", unit: "each", unitPrice: 3.48 },
    { name: "Single Gang Old Work Box", sku: "BOX-1OW", category: "Boxes & Fittings", unit: "each", unitPrice: 2.28 },
    { name: "Double Gang Old Work Box", sku: "BOX-2OW", category: "Boxes & Fittings", unit: "each", unitPrice: 3.98 },
    { name: '3/4" EMT Connector (Set Screw)', sku: "FIT-EMT-C075", category: "Boxes & Fittings", unit: "each", unitPrice: 0.68 },
    { name: '1" EMT Connector (Set Screw)', sku: "FIT-EMT-C100", category: "Boxes & Fittings", unit: "each", unitPrice: 0.98 },
    { name: '3/4" EMT Coupling', sku: "FIT-EMT-CP075", category: "Boxes & Fittings", unit: "each", unitPrice: 0.58 },
    { name: "PVC Cement (4oz)", sku: "FIT-PVC-CEM", category: "Boxes & Fittings", unit: "each", unitPrice: 6.48 },
    { name: '3/4" Conduit Straps (100pk)', sku: "FIT-STRAP075", category: "Boxes & Fittings", unit: "box", unitPrice: 12.98 },
    { name: "Weatherproof In-Use Cover (Single)", sku: "BOX-WP1", category: "Boxes & Fittings", unit: "each", unitPrice: 8.98 },

    // Lighting
    { name: "2x4 LED Flat Panel (40W, 5000K)", sku: "LIT-2X4", category: "Lighting", unit: "each", unitPrice: 42.98 },
    { name: "2x2 LED Flat Panel (30W, 4000K)", sku: "LIT-2X2", category: "Lighting", unit: "each", unitPrice: 36.98 },
    { name: "4ft LED Strip Light (40W)", sku: "LIT-4FT", category: "Lighting", unit: "each", unitPrice: 32.98 },
    { name: '6" LED Recessed Downlight (12W)', sku: "LIT-6REC", category: "Lighting", unit: "each", unitPrice: 14.98 },
    { name: "LED Exit Sign (Red, Battery Backup)", sku: "LIT-EXIT", category: "Lighting", unit: "each", unitPrice: 32.98 },
    { name: "LED Emergency Light (Twin Head)", sku: "LIT-EMER", category: "Lighting", unit: "each", unitPrice: 34.98 },
    { name: "LED Wall Pack (30W)", sku: "LIT-WPACK", category: "Lighting", unit: "each", unitPrice: 54.98 },
    { name: "LED Flood Light (50W)", sku: "LIT-FLOOD", category: "Lighting", unit: "each", unitPrice: 48.98 },
    { name: "Under Cabinet LED Light (24in)", sku: "LIT-UCAB", category: "Lighting", unit: "each", unitPrice: 28.98 },
    { name: "Track Light Head (LED, Adjustable)", sku: "LIT-TRACK", category: "Lighting", unit: "each", unitPrice: 22.98 },

    // Miscellaneous
    { name: "Wire Nuts Yellow (100pk)", sku: "MISC-WN-Y", category: "Miscellaneous", unit: "box", unitPrice: 5.98 },
    { name: "Wire Nuts Red (100pk)", sku: "MISC-WN-R", category: "Miscellaneous", unit: "box", unitPrice: 6.48 },
    { name: "Cable Staples (200pk)", sku: "MISC-STAPLE", category: "Miscellaneous", unit: "box", unitPrice: 4.98 },
    { name: "Electrical Tape Black (3pk)", sku: "MISC-TAPE", category: "Miscellaneous", unit: "pack", unitPrice: 5.48 },
    { name: '1/4" x 1-3/4" Tapcon Anchors (25pk)', sku: "MISC-TAPCON", category: "Miscellaneous", unit: "box", unitPrice: 12.48 },
    { name: "Fire Caulk (10.3oz)", sku: "MISC-FCAULK", category: "Miscellaneous", unit: "each", unitPrice: 8.98 },
    { name: '5/8" x 8ft Ground Rod (Copper)', sku: "MISC-GROD", category: "Miscellaneous", unit: "each", unitPrice: 18.98 },
    { name: "Ground Rod Clamp (Acorn)", sku: "MISC-GCLAMP", category: "Miscellaneous", unit: "each", unitPrice: 3.98 },
    { name: '#6 Bare Copper Ground Wire (per ft)', sku: "MISC-GWIRE", category: "Miscellaneous", unit: "ft", unitPrice: 1.28 },
    { name: "Zip Ties 8in (100pk)", sku: "MISC-ZIP", category: "Miscellaneous", unit: "pack", unitPrice: 3.98 },
  ];

  for (const mat of materials) {
    await prisma.material.create({ data: mat });
  }

  console.log(`Seeded ${materials.length} materials`);

  // Seed a sample project
  const project = await prisma.project.create({
    data: {
      name: "Office TI - Suite 200 Electrical",
      clientName: "Juan Rivera",
      clientCompany: "Rivera Commercial Group",
      address: "8500 NW 36th St",
      city: "Doral",
      state: "FL",
      zip: "33166",
      type: "commercial",
      status: "draft",
      description:
        "Complete electrical rough-in and finish for 2,400 SF office tenant improvement. Includes new sub-panel, lighting, receptacles, data drops, and fire alarm coordination.",
      overheadPct: 0.15,
      profitPct: 0.10,
      laborRate: 65.0,
      notes: "",
      terms:
        "Payment terms: Net 30. This estimate is valid for 30 days from the date of issue. All work performed in accordance with the National Electrical Code (NEC) and Florida Building Code (FBC). Permit fees not included unless specified. Manny Source Electric Corp — FL License #22E000394 / ER13016064.",
    },
  });

  // Add line items to sample project
  const sampleItems = [
    { description: "100A Sub Panel 20-Space", category: "Panels & Breakers", quantity: 1, unit: "each", unitPrice: 149.0, laborHours: 6, sortOrder: 0 },
    { description: "20A Single Pole Breaker", category: "Panels & Breakers", quantity: 20, unit: "each", unitPrice: 6.98, laborHours: 3, sortOrder: 1 },
    { description: "20A AFCI Breaker", category: "Panels & Breakers", quantity: 8, unit: "each", unitPrice: 38.98, laborHours: 1.5, sortOrder: 2 },
    { description: "12/2 Romex NM-B (250ft)", category: "Wire", quantity: 4, unit: "roll", unitPrice: 89.97, laborHours: 16, sortOrder: 3 },
    { description: "10/3 Romex NM-B (125ft)", category: "Wire", quantity: 2, unit: "roll", unitPrice: 119.0, laborHours: 6, sortOrder: 4 },
    { description: '3/4" EMT Conduit (10ft)', category: "Conduit", quantity: 30, unit: "each", unitPrice: 5.48, laborHours: 12, sortOrder: 5 },
    { description: '3/4" EMT Connector (Set Screw)', category: "Boxes & Fittings", quantity: 60, unit: "each", unitPrice: 0.68, laborHours: 3, sortOrder: 6 },
    { description: '3/4" EMT Coupling', category: "Boxes & Fittings", quantity: 30, unit: "each", unitPrice: 0.58, laborHours: 1.5, sortOrder: 7 },
    { description: "20A Duplex Receptacle", category: "Devices", quantity: 24, unit: "each", unitPrice: 1.28, laborHours: 8, sortOrder: 8 },
    { description: "20A GFCI Receptacle", category: "Devices", quantity: 4, unit: "each", unitPrice: 18.98, laborHours: 2, sortOrder: 9 },
    { description: "Single Pole Switch", category: "Devices", quantity: 12, unit: "each", unitPrice: 0.98, laborHours: 4, sortOrder: 10 },
    { description: "2x4 LED Flat Panel (40W, 5000K)", category: "Lighting", quantity: 24, unit: "each", unitPrice: 42.98, laborHours: 12, sortOrder: 11 },
    { description: "LED Exit Sign (Red, Battery Backup)", category: "Lighting", quantity: 3, unit: "each", unitPrice: 32.98, laborHours: 3, sortOrder: 12 },
    { description: "LED Emergency Light (Twin Head)", category: "Lighting", quantity: 4, unit: "each", unitPrice: 34.98, laborHours: 4, sortOrder: 13 },
    { description: "Single Gang Old Work Box", category: "Boxes & Fittings", quantity: 40, unit: "each", unitPrice: 2.28, laborHours: 8, sortOrder: 14 },
    { description: "Demo existing lighting and devices", category: "Demolition", quantity: 1, unit: "lot", unitPrice: 0, laborHours: 16, sortOrder: 15 },
  ];

  for (const item of sampleItems) {
    await prisma.lineItem.create({
      data: {
        projectId: project.id,
        ...item,
      },
    });
  }

  console.log(`Seeded sample project with ${sampleItems.length} line items`);
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
