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
  
          const isAdvertisement =
            offerData[7] && offerData[7].toLowerCase() === "true";
  
          const offerHtml = `
            <div class="bg-white shadow-lg rounded-lg overflow-hidden relative column-gradient-border h-full flex flex-col">
              <div class="flex-grow">
                <li class="is-active mt-1.5 pb-2 text-center">
                  <button class="font-bold py-2 px-4 rounded bg-transparent border-2 border-black text-black hover:bg-black hover:text-white transition-colors">Special Offer</button>
                </li>
                <div class="px-4">
                  ${
                    isAdvertisement
                      ? `
                    <div class="">
                      <img src="${offerData[6].replace(/"/g, "")}" alt="${offerData[0].replace(/"/g, "")}" class="rounded w-full ">
                    </div>
                  `
                      : `
                  <div class="flex flex-col">
                    <img src="${offerData[6].replace(/"/g, "")}" alt="${offerData[0].replace(/"/g, "")}" class="rounded w-full">
                    <div class="flex flex-col items-start justify-center mt-2">
                    <p class="pl-2 text-blue-950 md:leading-normal leading-4 text-sm font-normal mt-1">Stock: ${offerData[2].replace(/"/g, "")}</p>
                    <p class="pl-2 text-blue-950 md:leading-normal leading-4 text-sm font-normal">VIN: ${offerData[5].replace(/"/g, "")}</p>
                    </div>
                  </div>
                    `
                  }
                    <div class="h-20 sm:h-20 md:h-24">
                  <div class="text-start pl-2 absolute xl:bottom-[8%] lg:bottom-[9%] md:bottom-[8%] sm:bottom-[7%] bottom-[8.5%] left-[16px]">
                    <div class="flex flex-col justify-end items-start">
                      <h3 class="text-[#333] mt-2 md:leading-normal leading-4 text-base capitalize font-medium">${offerData[0].replace(/"/g, "")}</h3>
                      <p class="text-green-500 text-base font-medium mb-1">${offerData[1].replace(/"/g, "")}</p>
                      ${offerData[8] && offerData[8].trim() ? `<a href="${offerData[8].replace(/"/g, "")}" class="text-blue-600 text-sm underline hover:text-blue-800 mb-2" target="_blank">Learn more</a>` : ""}
                      <p class="text-blue-950 md:leading-normal leading-4 text-sm font-normal mb-2">Expires on: ${offerData[3].replace(/"/g, "")}</p>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
              <div class="mt-auto w-full">
                <button class="claim-offer bg-blue-500 font-bold text-white py-2 px-4 rounded w-full text-center hover:bg-blue-700 transition-colors mt-4"
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
  