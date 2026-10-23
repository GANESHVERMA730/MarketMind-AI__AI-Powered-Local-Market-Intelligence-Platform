const crypto = require('crypto');
const { connectDb, disconnectDb } = require('../src/config/db');
const { DemoSeedRun } = require('../src/models/DemoSeedRun');
const { Product } = require('../src/models/Product');
const { Sale } = require('../src/models/Sale');
const { SyntheticMarketPrice } = require('../src/models/SyntheticMarketPrice');
const { User } = require('../src/models/User');
const { createDemoPlan, DEFAULT_HISTORY_DAYS } = require('./demoDataGenerator');

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : null;
}

async function removeDemoRun(run) {
  await Sale.deleteMany({ _id: { $in: run.saleIds || [] } });
  await Product.deleteMany({ _id: { $in: run.productIds || [] } });
  await SyntheticMarketPrice.deleteMany({ _id: { $in: run.marketPriceIds || [] } });
  await User.deleteMany({ _id: { $in: run.generatedUserIds || [] } });
  await DemoSeedRun.deleteOne({ _id: run._id });
}

async function assertIdsAvailable(plan) {
  const [user, product, sale, marketPrice] = await Promise.all([
    User.findOne({
      $or: [
        { _id: { $in: plan.users.map((item) => item._id) } },
        { email: { $in: plan.users.map((item) => item.email) } },
      ],
    }).select('_id email'),
    Product.exists({ _id: { $in: plan.products.map((item) => item._id) } }),
    Sale.exists({ _id: { $in: plan.sales.map((item) => item._id) } }),
    SyntheticMarketPrice.exists({ _id: { $in: plan.marketPrices.map((item) => item._id) } }),
  ]);

  if (user || product || sale || marketPrice) {
    throw new Error(
      'Generated IDs already exist without a matching seed-run record. No data was changed; inspect the database before seeding.'
    );
  }
}

async function seedDemo({
  seed = Number(process.env.DEMO_SEED || 42),
  reset = false,
  demoEmail = process.env.DEMO_USER_EMAIL || null,
  endDate = process.env.DEMO_END_DATE,
  historyDays = Number(process.env.DEMO_HISTORY_DAYS || DEFAULT_HISTORY_DAYS),
  shopCount,
  productsPerShop,
} = {}) {
  let existingRun = await DemoSeedRun.findOne({ seed });
  if (existingRun && !reset) {
    throw new Error(
      `Synthetic seed ${seed} already exists. Use the reset command to remove only its recorded data before regenerating it.`
    );
  }
  if (existingRun && reset) {
    await removeDemoRun(existingRun);
    existingRun = null;
  }

  let attachedUserId = null;
  if (demoEmail) {
    const user = await User.findOne({ email: normalizeEmail(demoEmail) }).select('_id');
    if (!user) {
      throw new Error('DEMO_USER_EMAIL must match an existing registered account. Register locally first; no account or password will be created for it.');
    }
    attachedUserId = user._id;
  }

  const plan = createDemoPlan({
    seed,
    endDate,
    historyDays,
    shopCount,
    productsPerShop,
    attachedUserId,
  });
  await assertIdsAvailable(plan);

  const run = await DemoSeedRun.create({
    seed: plan.seed,
    runKey: plan.runKey,
    status: 'in_progress',
    historyStart: plan.historyStart,
    historyEnd: plan.historyEnd,
    shops: plan.shops,
    generatedUserIds: plan.users.map((user) => user._id),
    productRecords: plan.productRecords,
    productIds: plan.products.map((product) => product._id),
    saleIds: plan.sales.map((sale) => sale._id),
    marketPriceIds: plan.marketPrices.map((price) => price._id),
    counts: {
      shops: plan.shops.length,
      products: plan.products.length,
      sales: plan.sales.length,
      marketPrices: plan.marketPrices.length,
    },
  });

  for (const user of plan.users) {
    await User.create({
      ...user,
      password: crypto.randomBytes(32).toString('base64url'),
    });
  }

  if (plan.products.length) await Product.insertMany(plan.products, { ordered: true });
  if (plan.sales.length) await Sale.insertMany(plan.sales, { ordered: true });
  if (plan.marketPrices.length) {
    await SyntheticMarketPrice.insertMany(plan.marketPrices, { ordered: true });
  }

  run.status = 'completed';
  await run.save();

  return {
    seed: plan.seed,
    runKey: plan.runKey,
    historyStart: plan.historyStart,
    historyEnd: plan.historyEnd,
    counts: run.counts,
    linkedExistingAccount: Boolean(attachedUserId),
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--seed' && argv[index + 1]) {
      options.seed = Number(argv[++index]);
    } else if (arg === '--demo-email' && argv[index + 1]) {
      options.demoEmail = argv[++index];
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new Error(`Unknown or incomplete option: ${arg}`);
    }
  }
  return options;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: npm run seed:demo -- [--seed <integer>] [--demo-email <registered-email>] [--reset]');
    return;
  }

  await connectDb();
  try {
    const result = await seedDemo(options);
    console.log(`Synthetic demo data generated for seed ${result.seed}.`);
    console.log(`History: ${result.historyStart.toISOString().slice(0, 10)} through ${result.historyEnd.toISOString().slice(0, 10)} (UTC).`);
    console.log(`Shops: ${result.counts.shops}; products: ${result.counts.products}; sales: ${result.counts.sales}; synthetic market-price observations: ${result.counts.marketPrices}.`);
    if (result.linkedExistingAccount) {
      console.log('Generated inventory and sales are attached to the specified existing account. No credentials were created or displayed.');
    } else {
      console.log('Synthetic account credentials are random and are not displayed. Register an account and rerun with --demo-email to load a local shop dashboard.');
    }
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Demo-data generation failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  seedDemo,
  removeDemoRun,
  parseArgs,
};
