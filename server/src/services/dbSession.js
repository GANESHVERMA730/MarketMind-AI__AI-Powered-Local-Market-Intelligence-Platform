const mongoose = require('mongoose');

let cachedSupport;

function isTransactionUnsupported(err) {
  const message = err && err.message ? err.message : '';
  return (
    err.code === 20 ||
    err.codeName === 'IllegalOperation' ||
    /replica set|mongos|transaction numbers are only allowed/i.test(message)
  );
}

async function transactionsSupported() {
  if (cachedSupport !== undefined) {
    return cachedSupport;
  }

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  cachedSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');

  return cachedSupport;
}

function resetTransactionProbe() {
  cachedSupport = undefined;
}

async function runWithOptionalTransaction(work) {
  const supported = await transactionsSupported();

  if (!supported) {
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

module.exports = {
  isTransactionUnsupported,
  transactionsSupported,
  runWithOptionalTransaction,
  resetTransactionProbe,
};
