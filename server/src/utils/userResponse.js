function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    shopName: user.shopName,
    shopAddress: user.shopAddress || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = { toPublicUser };
