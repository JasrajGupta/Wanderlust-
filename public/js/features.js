
  let currentOrder = "asc";
  function sortByPrice() {
    window.location.href = `/listings/sort?order=${currentOrder}`;
    currentOrder = currentOrder === "asc" ? "desc" : "asc"; // toggle next click
  }
