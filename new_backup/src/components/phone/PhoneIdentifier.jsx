import React, { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Phone } from "lucide-react";

const areaCodeToState = {
  "205": "Alabama", "251": "Alabama", "256": "Alabama", "334": "Alabama", "659": "Alabama", "938": "Alabama",
  "907": "Alaska",
  "480": "Arizona", "520": "Arizona", "602": "Arizona", "623": "Arizona", "928": "Arizona",
  "327": "Arkansas", "479": "Arkansas", "501": "Arkansas", "870": "Arkansas",
  "209": "California", "213": "California", "279": "California", "310": "California", "323": "California", "341": "California", "350": "California", "369": "California", "408": "California", "415": "California", "424": "California", "442": "California", "510": "California", "530": "California", "559": "California", "562": "California", "619": "California", "626": "California", "628": "California", "650": "California", "657": "California", "661": "California", "669": "California", "707": "California", "714": "California", "747": "California", "760": "California", "805": "California", "818": "California", "820": "California", "831": "California", "840": "California", "858": "California", "909": "California", "916": "California", "925": "California", "949": "California", "951": "California",
  "303": "Colorado", "719": "Colorado", "720": "Colorado", "970": "Colorado", "983": "Colorado",
  "203": "Connecticut", "475": "Connecticut", "860": "Connecticut", "959": "Connecticut",
  "302": "Delaware",
  "239": "Florida", "305": "Florida", "321": "Florida", "324": "Florida", "352": "Florida", "386": "Florida", "407": "Florida", "448": "Florida", "561": "Florida", "645": "Florida", "656": "Florida", "689": "Florida", "727": "Florida", "728": "Florida", "754": "Florida", "772": "Florida", "786": "Florida", "813": "Florida", "850": "Florida", "863": "Florida", "904": "Florida", "941": "Florida", "954": "Florida",
  "229": "Georgia", "404": "Georgia", "470": "Georgia", "478": "Georgia", "678": "Georgia", "706": "Georgia", "762": "Georgia", "770": "Georgia", "912": "Georgia", "943": "Georgia",
  "808": "Hawaii",
  "208": "Idaho", "986": "Idaho",
  "217": "Illinois", "224": "Illinois", "309": "Illinois", "312": "Illinois", "331": "Illinois", "447": "Illinois", "464": "Illinois", "618": "Illinois", "630": "Illinois", "708": "Illinois", "730": "Illinois", "773": "Illinois", "779": "Illinois", "815": "Illinois", "847": "Illinois", "861": "Illinois", "872": "Illinois",
  "219": "Indiana", "260": "Indiana", "317": "Indiana", "463": "Indiana", "574": "Indiana", "765": "Indiana", "812": "Indiana", "930": "Indiana",
  "319": "Iowa", "515": "Iowa", "563": "Iowa", "641": "Iowa", "712": "Iowa",
  "316": "Kansas", "620": "Kansas", "785": "Kansas", "913": "Kansas",
  "270": "Kentucky", "364": "Kentucky", "502": "Kentucky", "606": "Kentucky", "859": "Kentucky",
  "225": "Louisiana", "318": "Louisiana", "337": "Louisiana", "504": "Louisiana", "985": "Louisiana",
  "207": "Maine",
  "227": "Maryland", "240": "Maryland", "301": "Maryland", "410": "Maryland", "443": "Maryland", "667": "Maryland",
  "339": "Massachusetts", "351": "Massachusetts", "413": "Massachusetts", "508": "Massachusetts", "617": "Massachusetts", "774": "Massachusetts", "781": "Massachusetts", "857": "Massachusetts", "978": "Massachusetts",
  "231": "Michigan", "248": "Michigan", "269": "Michigan", "313": "Michigan", "517": "Michigan", "586": "Michigan", "616": "Michigan", "734": "Michigan", "810": "Michigan", "906": "Michigan", "947": "Michigan", "989": "Michigan",
  "218": "Minnesota", "320": "Minnesota", "507": "Minnesota", "612": "Minnesota", "651": "Minnesota", "763": "Minnesota", "952": "Minnesota",
  "228": "Mississippi", "601": "Mississippi", "662": "Mississippi", "769": "Mississippi",
  "235": "Missouri", "314": "Missouri", "417": "Missouri", "557": "Missouri", "573": "Missouri", "636": "Missouri", "660": "Missouri", "816": "Missouri", "975": "Missouri",
  "406": "Montana",
  "308": "Nebraska", "402": "Nebraska", "531": "Nebraska",
  "702": "Nevada", "725": "Nevada", "775": "Nevada",
  "603": "New Hampshire",
  "201": "New Jersey", "551": "New Jersey", "609": "New Jersey", "640": "New Jersey", "732": "New Jersey", "848": "New Jersey", "856": "New Jersey", "862": "New Jersey", "908": "New Jersey", "973": "New Jersey",
  "505": "New Mexico", "575": "New Mexico",
  "212": "New York", "315": "New York", "329": "New York", "332": "New York", "347": "New York", "363": "New York", "516": "New York", "518": "New York", "585": "New York", "607": "New York", "624": "New York", "631": "New York", "646": "New York", "680": "New York", "716": "New York", "718": "New York", "838": "New York", "845": "New York", "914": "New York", "917": "New York", "929": "New York", "934": "New York",
  "252": "North Carolina", "336": "North Carolina", "472": "North Carolina", "704": "North Carolina", "743": "North Carolina", "828": "North Carolina", "910": "North Carolina", "919": "North Carolina", "980": "North Carolina", "984": "North Carolina",
  "701": "North Dakota",
  "216": "Ohio", "220": "Ohio", "234": "Ohio", "283": "Ohio", "326": "Ohio", "330": "Ohio", "380": "Ohio", "419": "Ohio", "436": "Ohio", "440": "Ohio", "513": "Ohio", "567": "Ohio", "614": "Ohio", "740": "Ohio", "937": "Ohio",
  "405": "Oklahoma", "539": "Oklahoma", "572": "Oklahoma", "580": "Oklahoma", "918": "Oklahoma",
  "458": "Oregon", "503": "Oregon", "541": "Oregon", "971": "Oregon",
  "215": "Pennsylvania", "223": "Pennsylvania", "267": "Pennsylvania", "272": "Pennsylvania", "412": "Pennsylvania", "445": "Pennsylvania", "484": "Pennsylvania", "570": "Pennsylvania", "582": "Pennsylvania", "610": "Pennsylvania", "717": "Pennsylvania", "724": "Pennsylvania", "814": "Pennsylvania", "835": "Pennsylvania", "878": "Pennsylvania",
  "401": "Rhode Island",
  "803": "South Carolina", "839": "South Carolina", "843": "South Carolina", "854": "South Carolina", "864": "South Carolina",
  "605": "South Dakota",
  "423": "Tennessee", "615": "Tennessee", "629": "Tennessee", "731": "Tennessee", "865": "Tennessee", "901": "Tennessee", "931": "Tennessee",
  "210": "Texas", "214": "Texas", "254": "Texas", "281": "Texas", "325": "Texas", "346": "Texas", "361": "Texas", "409": "Texas", "430": "Texas", "432": "Texas", "469": "Texas", "512": "Texas", "682": "Texas", "713": "Texas", "726": "Texas", "737": "Texas", "806": "Texas", "817": "Texas", "830": "Texas", "832": "Texas", "903": "Texas", "915": "Texas", "936": "Texas", "940": "Texas", "945": "Texas", "956": "Texas", "972": "Texas", "979": "Texas",
  "385": "Utah", "435": "Utah", "801": "Utah",
  "802": "Vermont",
  "276": "Virginia", "434": "Virginia", "540": "Virginia", "571": "Virginia", "686": "Virginia", "703": "Virginia", "757": "Virginia", "804": "Virginia", "826": "Virginia", "948": "Virginia",
  "206": "Washington", "253": "Washington", "360": "Washington", "425": "Washington", "509": "Washington", "564": "Washington",
  "202": "Washington, DC", "771": "Washington, DC",
  "304": "West Virginia", "681": "West Virginia",
  "262": "Wisconsin", "274": "Wisconsin", "353": "Wisconsin", "414": "Wisconsin", "534": "Wisconsin", "608": "Wisconsin", "715": "Wisconsin", "920": "Wisconsin",
  "307": "Wyoming"
};

const PhoneIdentifier = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [result, setResult] = useState(null);

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value;
    const cleanedValue = rawValue.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(cleanedValue);
    setResult(null);
  };

  const identifyState = () => {
    if (phoneNumber.length >= 3) {
      const areaCode = phoneNumber.slice(0, 3);
      const state = areaCodeToState[areaCode];
      setResult({
        areaCode,
        state: state || "Estado no encontrado",
        found: !!state
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">Identificador</h2>
                <p className="text-gray-600 text-sm">
                  Ingresa un número telefónico para identificar el estado.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="relative w-full">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: 2125550000"
                  />
                </div>
                <Button
                  onClick={identifyState}
                  disabled={phoneNumber.length < 3}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 w-full"
                >
                  <Search className="h-5 w-5" />
                  Identificar
                </Button>
              </div>

              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg text-center ${
                    result.found
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">Código de área: <b>{result.areaCode}</b></p>
                  <p className={`text-lg font-bold ${result.found ? "text-green-700" : "text-red-700"}`}>
                    {result.state}
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PhoneIdentifier;