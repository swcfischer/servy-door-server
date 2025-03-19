module.exports = (sequelize, DataTypes) => {
  var FunFacts = sequelize.define("fun_facts", {
    googleId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    facts: {
      type: DataTypes.JSONB, // Use JSONB for better performance and indexing in PostgreSQL
      allowNull: false,
    },
  });

  return FunFacts;
};
