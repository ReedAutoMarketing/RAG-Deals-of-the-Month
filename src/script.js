document.addEventListener("DOMContentLoaded", (event) => {
  // Use event delegation for dynamically added 'Claim Offer' buttons
  document
    .getElementById("offers-container")
    .addEventListener("click", function (event) {
      // Check if the clicked element has the 'claim-offer' class
      if (event.target && event.target.matches(".claim-offer")) {
        event.preventDefault();
        var couponCode = event.target.getAttribute("data-coupon");
        var vehicleModel = event.target.getAttribute("data-model");
        var vin = event.target.getAttribute("data-vin");
        var discount = event.target.getAttribute("data-discount");

        // Wait for the modal to be fully opened and the form to be rendered
        setTimeout(function () {
          var commentsBox = document.getElementById("input_3_4");
          if (commentsBox) {
            // Populate the comments textarea in the Gravity Forms form
            commentsBox.value =
              "Vehicle Model: " +
              vehicleModel +
              "\nStock: " +
              couponCode +
              "\nVIN: " +
              vin +
              "\nOffer: " +
              discount;
          }
        }, 500);

        // Toggle the modal
        var modal = document.getElementById("dealsOfTheMonthForm");
      }
    });
});

function fetchOffers() {
  const targetUrl =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjcfknXWqSF0jAiiOgTe7GW_uoGo74U7mpx_YIiGxMU7lPkCC6hTw_GaXKbOVaiJhSIkEuPJA-i0Lo/pub?gid=1980739767&single=true&output=csv";

  fetch(targetUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((csvData) => {
      // console.log("CSV Data:", csvData); // Debugging line
      const offers = csvData.split(/\r\n|\n|\r/).slice(1); // Adjusted slice index
      const offersContainer = document.getElementById("offers-container");

      offers.forEach((offer, index) => {
        // console.log(`Offer ${index}:`, offer); // Debugging line
        if (!offer.trim()) return;
        const offerData = offer.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (offerData.length < 5 || offerData[4].toLowerCase() !== "true")
          return;

        const offerHtml = `
          <div class="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden relative h-full flex flex-col">
            <div class="flex-grow">
              <div class="relative">
                <div class="overflow-hidden">
                  <img src="${offerData[6].replace(/"/g, "")}" alt="${offerData[0].replace(/"/g, "")}" class="w-full object-cover h-48 hover:scale-105 transition-transform duration-500">
                </div>
                <div class="absolute top-3 right-3">
                    <span class="inline-block text-xs font-medium py-1 px-2.5 rounded-full bg-green-100 text-green-700 shadow-sm">Special Offer</span>
                  </div>
              </div>
              <div class="p-4 space-y-4">
                <div>
                  <h3 class="text-slate-900 text-xl capitalize font-semibold leading-tight tracking-tight">${offerData[0].replace(/"/g, "")}</h3>
                  <p class="text-green-600 text-lg font-bold mt-1.5">${offerData[1].replace(/"/g, "")}</p>
                  ${offerData[8] && offerData[8].trim() ? `
                  <a href="${offerData[8].replace(/"/g, "")}" class="text-blue-600 text-sm font-medium hover:text-blue-800 mt-1 inline-flex items-center" target="_blank">
                    Learn more 
                    <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </a>` : ""}
                </div>
                <div class="flex items-center gap-4">
                  <div class="flex-1 border border-gray-100 rounded-md px-3 py-2">
                    <p class="text-xs uppercase tracking-wide text-gray-500 font-medium mb-0.5">Stock</p>
                    <p class="text-sm font-medium text-gray-800">${offerData[2].replace(/"/g, "")}</p>
                  </div>
                  <div class="flex-1 border border-gray-100 rounded-md px-3 py-2">
                    <p class="text-xs uppercase tracking-wide text-gray-500 font-medium mb-0.5">VIN</p>
                    <p class="text-sm font-medium text-gray-800">${offerData[5].replace(/"/g, "")}</p>
                  </div>
                </div>
                <div class="flex items-center text-sm text-gray-500 py-1.5 px-3 bg-gray-50 rounded-md w-fit">
                  <span class="text-xs font-medium uppercase tracking-wide">Expires:</span>
                  <span class="ml-2 font-medium text-gray-700">${offerData[3].replace(/"/g, "")}</span>
                </div>
              </div>
            </div>
            <div class="px-4 pb-4 pt-1 w-full mt-auto">
              <button class="claim-offer bg-blue-600 font-medium text-white py-2.5 px-4 rounded-lg w-full text-center hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
              data-coupon="${offerData[2]}" data-discount="${offerData[1].replace(/"/g, "")}" data-model="${offerData[0].replace(/"/g, "")}"
                data-toggle="modal" data-vin="${offerData[5].replace(/"/g, "")}" data-target="#DIModal" data-modal-content="#dealsOfTheMonthForm" data-modal-title="${offerData[0].replace(/"/g, "")}">
                Claim Offer
              </button>
            </div>
          </div>
`;

        const offerElement = document.createElement("div");
        offerElement.className = "offer-card";
        offerElement.innerHTML = offerHtml;
        offersContainer.appendChild(offerElement);
      });
    })
    .catch((error) => console.error("Error:", error));
}

fetchOffers();
