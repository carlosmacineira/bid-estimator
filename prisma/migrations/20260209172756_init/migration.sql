-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCompany" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "zip" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'commercial',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "overheadPct" REAL NOT NULL DEFAULT 0.15,
    "profitPct" REAL NOT NULL DEFAULT 0.10,
    "laborRate" REAL NOT NULL DEFAULT 65.0,
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "laborHours" REAL NOT NULL DEFAULT 0,
    "laborRate" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "materialId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LineItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'application/pdf',
    "filePath" TEXT NOT NULL,
    "tag" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Manny Source Electric Corp',
    "address" TEXT NOT NULL DEFAULT '3932 SW 160th St, Miami, FL 33177',
    "phone" TEXT NOT NULL DEFAULT '(786) 299-2168',
    "license" TEXT NOT NULL DEFAULT 'ER13016064',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT 'mannysourceelectric.com',
    "defaultLaborRate" REAL NOT NULL DEFAULT 65.0,
    "defaultOverhead" REAL NOT NULL DEFAULT 0.15,
    "defaultProfit" REAL NOT NULL DEFAULT 0.10,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "defaultTerms" TEXT NOT NULL DEFAULT 'Payment terms: Net 30. This estimate is valid for 30 days from the date of issue. All work performed in accordance with the National Electrical Code (NEC) and Florida Building Code (FBC). Permit fees not included unless specified. Manny Source Electric Corp — FL License #22E000394 / ER13016064.'
);
