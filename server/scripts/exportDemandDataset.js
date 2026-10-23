const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { connectDb, disconnectDb } = require('../src/config/db');
const { DemoSeedRun } = require('../src/models/DemoSeedRun');
const { Product } = require('../src/models/Product');
const { Sale } = require('../src/models/Sale');

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, '..', '..');
const PYTHON_EXPORTER = path.join(ROOT, 'ml-service', 'scripts', 'export_demand_dataset.py');
const OUTPUT_FILE = path.join(ROOT, 'ml-service', 'data', 'processed', 'product-daily-demand.csv');

function parseSeed(argv) {
  const seedIndex = argv.indexOf('--seed');
  if (seedIndex === -1) return Number(process.env.DEMO_SEED || 42);
  const seed = Number(argv[seedIndex + 1]);
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('--seed must be a non-negative safe integer');
  return seed;
}

async function exportDemandDataset({ seed = Number(process.env.DEMO_SEED || 42), python = process.env.PYTHON_EXECUTABLE || 'python' } = {}) {
  await connectDb();
  const tempFile = path.join(os.tmpdir(), `marketmind-demand-${process.pid}-${Date.now()}.json`);
  try {
    const run = await DemoSeedRun.findOne({ seed, status: 'completed' }).lean();
    if (!run) {
      throw new Error(`Completed synthetic seed ${seed} was not found. Run the demo-data seed command first.`);
    }

    const shopIdByUserId = new Map(run.shops.map((shop) => [String(shop.userId), shop.shopId]));
    const productRecordById = new Map(
      run.productRecords.map((record) => [String(record.productId), record])
    );
    const [products, sales] = await Promise.all([
      Product.find({ _id: { $in: run.productIds } })
        .select('_id userId name sku category sellingPrice costPrice')
        .lean(),
      Sale.find({ _id: { $in: run.saleIds }, status: 'completed' })
        .select('_id userId soldAt items.productId items.quantity')
        .lean(),
    ]);

    const payload = {
      schemaVersion: 1,
      seed: {
        seed: run.seed,
        historyStart: run.historyStart.toISOString().slice(0, 10),
        historyEnd: run.historyEnd.toISOString().slice(0, 10),
      },
      products: products.map((product) => {
        const record = productRecordById.get(String(product._id));
        const shopId = shopIdByUserId.get(String(product.userId));
        if (!record || !shopId) {
          throw new Error(`Seed metadata is missing stock or shop information for product ${product._id}`);
        }
        return {
          shop_id: shopId,
          product_id: String(product._id),
          name: product.name,
          sku: product.sku,
          category: product.category,
          selling_price: product.sellingPrice,
          cost_price: product.costPrice,
          opening_stock: record.openingStock,
        };
      }),
      sales: sales.map((sale) => {
        const shopId = shopIdByUserId.get(String(sale.userId));
        if (!shopId) throw new Error(`Seed metadata is missing shop information for sale ${sale._id}`);
        return {
          shop_id: shopId,
          sold_at: sale.soldAt.toISOString(),
          status: 'completed',
          items: sale.items.map((item) => ({
            product_id: String(item.productId),
            quantity: item.quantity,
          })),
        };
      }),
    };

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(tempFile, JSON.stringify(payload), 'utf8');
    await execFileAsync(python, [PYTHON_EXPORTER, '--input', tempFile, '--output', OUTPUT_FILE], {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      file: OUTPUT_FILE,
      productCount: products.length,
      saleCount: sales.length,
      historyStart: run.historyStart,
      historyEnd: run.historyEnd,
    };
  } finally {
    await fs.rm(tempFile, { force: true });
    await disconnectDb();
  }
}

async function main(argv = process.argv.slice(2)) {
  const seed = parseSeed(argv);
  const result = await exportDemandDataset({ seed });
  console.log(`Wrote product-level daily demand data to ${result.file}`);
  console.log(`Products: ${result.productCount}; completed sales: ${result.saleCount}; UTC history: ${result.historyStart.toISOString().slice(0, 10)} through ${result.historyEnd.toISOString().slice(0, 10)}.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Demand dataset export failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { exportDemandDataset, parseSeed };
