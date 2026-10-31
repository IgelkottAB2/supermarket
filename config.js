
window.SUPERMARKET_CONFIG = {
  demo: true,
  chainName: "IGELKOTTS SUPERMARKET",
  defaultStore: "Igelkotts Supermarket Hässleholm",
  currency: "SEK",
  mapGrid: 24,

  // Testprodukter. Priserna är exempel.
  products: [
    {
      id: "731001",
      name: "Mellanmjölk",
      brand: "ARLA",
      size: "1 liter",
      department: "Mejeri",
      price: 25,
      discount: 0
    },
    {
      id: "731002",
      name: "Laktosfri mjölk",
      brand: "ARLA",
      size: "1 liter",
      department: "Mejeri",
      price: 29.90,
      discount: 0
    },
    {
      id: "731003",
      name: "Bananer",
      brand: "Demo",
      size: "1 kg",
      department: "Frukt & grönt",
      price: 24.90,
      discount: 4
    },
    {
      id: "731004",
      name: "Bröd",
      brand: "Demo",
      size: "1 förpackning",
      department: "Bageri",
      price: 32.90,
      discount: 0
    },
    {
      id: "731005",
      name: "Pasta",
      brand: "Demo",
      size: "500 g",
      department: "Skafferi",
      price: 19.90,
      discount: 3
    }
  ],

  // Endast exempelvärden för pantdemonstrationen.
  pantTypes: [
    { id: "can33", name: "33 cl aluminiumburk", value: 1 },
    { id: "can50", name: "50 cl aluminiumburk", value: 2 },
    { id: "bottle50", name: "50 cl plastflaska", value: 2 }
  ]
};
