// Company and regulatory details shown in the footer and legal pages.
// Fill the empty values before launch (see docs/DEPLOYMENT_READINESS.md). Empty values are simply not shown.
export const LEGAL = {
  brand: "All Sky Fares",
  companyName: "All Sky Fares LLC", // registered legal entity, e.g. "All Sky Fares LLC"
  address: "30 North Gould Street, STE R, Sheridan, WY 82801, USA", // registered business address
  sellerOfTravel: "Registered in Wyoming (All Sky Fares LLC). Seller of travel registrations pending in applicable jurisdictions. Client trust protections maintained.",
  supportEmail: "support@allskyfares.com",
  legalEmail: "legal@allskyfares.com",
  phone: "+1 (877) 818-4167",
  phoneHref: "tel:+18778184167",
  policiesUpdated: "October 15, 2026",
};

export const legalEntity = () => LEGAL.companyName || LEGAL.brand;
