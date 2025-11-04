module.exports = (sequelize, DataTypes) => {
  const YouTubeSearchCache = sequelize.define(
    "youTubeSearchCache",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      query: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      results: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      totalResults: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resultsPerPage: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          fields: ["query"],
        },
        {
          fields: ["expiresAt"],
        },
      ],
    }
  );

  return YouTubeSearchCache;
};
