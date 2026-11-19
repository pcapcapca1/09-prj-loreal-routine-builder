/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearSelectedProductsButton = document.getElementById(
  "clearSelectedProducts"
);

/* Store selected products by id so they stay selected across categories */
const selectedProducts = new Map();
let allProducts = null;
const expandedProductIds = new Set();
const selectedProductsStorageKey = "loreal-selected-products";

/* Send requests to the project's Cloudflare Worker */
const workerUrl = "https://lorealchatbotworker.pcapcapca1.workers.dev/";
let routineGenerated = false;

/* Keep the conversation so the AI can answer follow-up questions */
const messages = [
  {
    role: "system",
    content:
      "You are a helpful L'Oreal skincare and beauty advisor. Search the web for current, relevant information and cite official L'Oreal or reliable beauty sources. Create clear, personalized routines using only the selected products supplied by the user. Answer only questions about the generated routine or beauty topics such as skincare, haircare, makeup, fragrance, and closely related areas. Politely explain that unrelated topics are outside your role.",
  },
];

/* Save selected products so they remain available after a page reload */
function saveSelectedProducts() {
  const productsToSave = Array.from(selectedProducts.values());
  try {
    localStorage.setItem(
      selectedProductsStorageKey,
      JSON.stringify(productsToSave)
    );
  } catch (error) {
    /* The app will still work if browser storage is unavailable */
  }
}

/* Restore saved product objects when the page loads */
function restoreSelectedProducts() {
  const savedProducts = localStorage.getItem(selectedProductsStorageKey);
  if (!savedProducts) return;

  try {
    const products = JSON.parse(savedProducts);
    products.forEach((product) => {
      if (product && product.id) {
        selectedProducts.set(product.id, product);
      }
    });
  } catch (error) {
    localStorage.removeItem(selectedProductsStorageKey);
  }
}

restoreSelectedProducts();

/* Start the selected-products list with restored or empty selections */
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
    <div class="product-card ${selectedProducts.has(product.id) ? "selected" : ""} ${expandedProductIds.has(product.id) ? "expanded" : ""}"
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
        <button type="button"
                class="details-toggle"
                data-product-id="${product.id}"
                aria-expanded="${expandedProductIds.has(product.id)}"
                aria-controls="description-${product.id}">
          ${expandedProductIds.has(product.id) ? "Hide details" : "View details"}
          <i class="fa-solid ${expandedProductIds.has(product.id) ? "fa-minus" : "fa-plus"}"></i>
        </button>
        <p class="product-description"
           id="description-${product.id}">
          ${product.description}
        </p>
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
    clearSelectedProductsButton.hidden = true;
    return;
  }

  clearSelectedProductsButton.hidden = false;
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
  saveSelectedProducts();
  routineGenerated = false;
}

/* Let users select or unselect cards */
productsContainer.addEventListener("click", (e) => {
  const detailsButton = e.target.closest(".details-toggle");
  if (detailsButton) {
    const productId = Number(detailsButton.dataset.productId);
    const card = detailsButton.closest(".product-card");
    const isExpanded = expandedProductIds.has(productId);

    if (isExpanded) {
      expandedProductIds.delete(productId);
    } else {
      expandedProductIds.add(productId);
    }

    card.classList.toggle("expanded", !isExpanded);
    detailsButton.setAttribute("aria-expanded", !isExpanded);
    detailsButton.innerHTML = isExpanded
      ? 'View details <i class="fa-solid fa-plus"></i>'
      : 'Hide details <i class="fa-solid fa-minus"></i>';
    return;
  }

  const card = e.target.closest(".product-card");
  if (card) {
    toggleProduct(Number(card.dataset.productId));
  }
});

/* Support keyboard use on product cards */
productsContainer.addEventListener("keydown", (e) => {
  if (e.target.closest(".details-toggle")) return;

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

  saveSelectedProducts();
  routineGenerated = false;
});

/* Clear every saved selection at once */
clearSelectedProductsButton.addEventListener("click", () => {
  selectedProducts.clear();
  saveSelectedProducts();
  displaySelectedProducts();

  document.querySelectorAll(".product-card.selected").forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
    card.querySelector(".selection-label").textContent = "Select";
  });

  routineGenerated = false;
});

/* Combine the category and text filters, then show matching products */
async function filterProducts() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const searchText = productSearch.value.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "" || product.category === selectedCategory;
    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.description,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      searchText === "" || searchableText.includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your search
      </div>
    `;
    return;
  }

  displayProducts(filteredProducts);
}

/* Update the grid whenever either filter changes */
categoryFilter.addEventListener("change", filterProducts);
productSearch.addEventListener("input", filterProducts);

/* Add a visible message to the chat transcript */
function displayChatMessage(role, text) {
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message ${role}`;
  messageElement.textContent = text;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Add the web sources returned by the search model as clickable links. */
function displaySourceLinks(annotations) {
  const citationLinks = new Map();

  annotations.forEach((annotation) => {
    const citation = annotation.url_citation ||
      (annotation.type === "url_citation" ? annotation : null);
    if (citation && citation.url) {
      citationLinks.set(citation.url, citation.title || citation.url);
    }
  });

  if (citationLinks.size === 0) return;

  const sourcesElement = document.createElement("div");
  sourcesElement.className = "chat-message assistant sources";
  const heading = document.createElement("strong");
  heading.textContent = "Sources";
  sourcesElement.appendChild(heading);

  citationLinks.forEach((title, url) => {
    const sourceLink = document.createElement("a");
    sourceLink.href = url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = title;
    sourcesElement.appendChild(document.createElement("br"));
    sourcesElement.appendChild(sourceLink);
  });

  chatWindow.appendChild(sourcesElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Send a message to the Cloudflare Worker and read the AI response */
async function sendMessage(message, visibleMessage = message) {
  messages.push({
    role: "user",
    content: message,
  });

  displayChatMessage("user", visibleMessage);
  displayChatMessage("assistant", "Thinking...");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not connect to the routine assistant.");
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    const annotations =
      data.choices[0].message.annotations ||
      data.choices[0].message.content_annotations ||
      [];

    messages.push({
      role: "assistant",
      content: reply,
    });

    const thinkingMessage = chatWindow.querySelector(".chat-message.assistant:last-child");
    if (thinkingMessage) thinkingMessage.remove();
    displayChatMessage("assistant", reply);
    displaySourceLinks(annotations);
    return true;
  } catch (error) {
    messages.pop();
    const thinkingMessage = chatWindow.querySelector(".chat-message.assistant:last-child");
    if (thinkingMessage) thinkingMessage.remove();
    displayChatMessage(
      "assistant",
      "Sorry, I could not generate a response. Please try again."
    );
    return false;
  }
}

/* Generate a routine from only the products selected by the user */
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProducts.size === 0) {
    chatWindow.textContent =
      "Please select at least one product before generating a routine.";
    return;
  }

  const selectedProductData = Array.from(selectedProducts.values()).map(
    (product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    })
  );

  const message =
    "Create a personalized routine using only these selected products. " +
    "Organize the steps clearly, explain the purpose of each step, " +
    "and include tips when helpful.\n\nSelected products:\n" +
    JSON.stringify(selectedProductData, null, 2);

  chatWindow.innerHTML = "";
  const generatedSuccessfully = await sendMessage(
    message,
    "Generate a personalized routine from my selected products."
  );
  if (generatedSuccessfully) {
    routineGenerated = true;
  }
});

/* Send follow-up questions using the saved conversation history */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const question = userInput.value.trim();

  if (question === "") return;

  if (!routineGenerated) {
    chatWindow.textContent =
      "Generate a routine first, then ask me a follow-up question.";
    return;
  }

  userInput.value = "";
  await sendMessage(question);
});
