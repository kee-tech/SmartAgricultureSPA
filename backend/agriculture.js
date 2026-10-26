
const agricultureData = {
  farm: {
    name: "Green Valley Farm",
    location: "Hyderabad, Telangana"
  },

  crops: [
    {
      id: 1,
      name: "Rice",
      season: "Kharif",
      area: 5,
      status: "Growing"
    },
    {
      id: 2,
      name: "Wheat",
      season: "Rabi",
      area: 3,
      status: "Ready for planting"
    },
    {
      id: 3,
      name: "Tomato",
      season: "Winter",
      area: 2,
      status: "Growing"
    }
  ],

  soil: {
    type: "Black soil",
    moisture: 65,
    ph: 6.8
  },

  weather: {
    temperature: 29,
    humidity: 70,
    rainfall: 12
  },

  irrigation: {
    status: "Active",
    waterUsage: 450,
    unit: "litres"
  }
};

module.exports = agricultureData;
