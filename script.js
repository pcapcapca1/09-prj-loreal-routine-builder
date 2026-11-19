/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Store selected products by id so they stay selected across categories */
const selectedProducts = new Map();
let allProducts = null;

/* Start the selected-products list in its empty state */
displaySelectedProducts();

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts) return allProducts;

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${selectedProducts.has(product.id) ? "selected" : ""}"
         role="button"
         tabindex="0"
         aria-pressed="${selectedProducts.has(product.id)}"
         data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <span class="selection-label">
          ${selectedProducts.has(product.id) ? "Selected" : "Select"}
        </span>
      </div>
    </div>
  `
    )
    .join("");
}

/* Update the list of selected products below the grid */
function displaySelectedProducts() {
  if (selectedProducts.size === 0) {
    selectedProductsList.innerHTML =
      '<p class="selected-empty">No products selected yet</p>';
    return;
  }

  selectedProductsList.innerHTML = Array.from(selectedProducts.values())
    .map(
      (product) => `
      <div class="selected-product">
        <img src="${product.image}" alt="">
        <span>${product.name}</span>
        <button type="button"
                class="remove-product"
                data-product-id="${product.id}"
                aria-label="Remove ${product.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
    )
    .join("");
}

/* Toggle a product when its card is clicked or activated with the keyboard */
async function toggleProduct(productId) {
  if (selectedProducts.has(productId)) {
    selectedProducts.delete(productId);
  } else {
    const products = await loadProducts();
    const product = products.find((item) => item.id === productId);
    if (product) {
      selectedProducts.set(productId, product);
    }
  }

  const card = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );
  if (card) {
    const isSelected = selectedProducts.has(productId);
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", isSelected);
    card.querySelector(".selection-label").textContent = isSelected
      ? "Selected"
      : "Select";
  }

  displaySelectedProducts();
}

/* Let users select or unselect cards */
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (card) {
    toggleProduct(Number(card.dataset.productId));
  }
});

/* Support keyboard use on product cards */
productsContainer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".product-card");
    if (card) {
      e.preventDefault();
      toggleProduct(Number(card.dataset.productId));
    }
  }
});

/* Remove a selected product directly from the selected-products list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-product");
  if (!removeButton) return;

  const productId = Number(removeButton.dataset.productId);
  selectedProducts.delete(productId);
  displaySelectedProducts();

  const card = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );
  if (card) {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
    card.querySelector(".selection-label").textContent = "Select";
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
