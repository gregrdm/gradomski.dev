/* ============================================================
   Visit counter for the AlgoLearn section — and only that section.

   The rest of the site loads nothing from a third party, and
   privacy.html says so. AlgoLearn is the exception: these pages
   load this file, which loads GoatCounter's count.js. GoatCounter
   sets no cookies and builds no profile; it gives a dashboard of
   page views, referrers and rough device/country counts.

   To switch it on, sign up at goatcounter.com, pick a site code
   (the "xxx" in xxx.goatcounter.com) and put it below. While the
   code is empty nothing is loaded. count.js also skips localhost
   and file:// on its own, so previewing locally never counts.

   The path that gets counted is the page's rel=canonical, so
   /algolearn/bubble-sort and /algolearn/bubble-sort.html land on
   one row in the dashboard.
   ============================================================ */

const GOATCOUNTER_CODE = "gradomski";

if (GOATCOUNTER_CODE) {
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}
