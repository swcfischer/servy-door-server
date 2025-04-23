module.exports = (sequelize, DataTypes) => {
  var BookWordDefinition = sequelize.define("bookWordDefinition", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bookId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    word: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
  });

  return BookWordDefinition;
};
