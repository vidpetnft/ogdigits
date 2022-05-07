import { BigNumber, utils } from "ethers";
import Head from "next/head";
import { useEffect, useState } from "react";

const LOCAL_TEST = false;
const LOCAL_STORAGE_VERSION = 8;
const CACHE_INVALIDATION_TIME = 300 * 1000;
const PRE_PUNK_CUT_OFF = 424;

const loadDigits = async () => {
  // if (
  //   localStorage.version == null ||
  //   localStorage.version < LOCAL_STORAGE_VERSION
  // ) {
  //   localStorage.clear();
  //   console.log("localStorage cleared");
  //   localStorage.version = LOCAL_STORAGE_VERSION;
  // }

  return await fetchDigits();
  // if (localStorage.digits == null) {
  //   return await fetchDigits();
  // } else {
  //   return JSON.parse(localStorage.digits);
  // }
};

const fetchDigits = async () => {
  // if (LOCAL_TEST) {
  //   storeDigits(testJson.jsonData);
  // } else {
  const response = await fetch("./2017digits.json", {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const data = await response.json();
  const digits = storeDigits(data);
  return digits;
  // }
};

function storeDigits(jsonData) {
  const digits = new Object();

  for (var key in jsonData) {
    var digitNameHash = getDigitHash(String(jsonData[key].name));
    digits[digitNameHash] = jsonData[key];
    digits[digitNameHash].price = 0;
  }

  localStorage.pricesUpdatedAt = -1;
  localStorage.digits = JSON.stringify(digits);
  return digits;
}

const DigitRow = ({
  digitId,
  digitName,
  digitPrice,
  digitRegDate,
  digitHash,
}) => {
  const digitOSLink =
    "https://opensea.io/assets/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85/" +
    digitHash;
  const digitENSLink =
    "https://app.ens.domains/name/" + digitName + ".eth/details";
  return (
    <div className="digit" id={digitHash} key={digitHash}>
      <div className="digit-id">#{digitId}</div>
      <div
        className="digit-name"
        style={{
          backgroundColor: getCellColor(digitPrice),
        }}
      >
        {`${digitName} .eth`}
      </div>
      <div className="digit-price">{getPriceLabel(digitPrice)}</div>
      <div className="digit-regdate">{digitRegDate}</div>
      <div className="digit-oslink">
        <a href={digitOSLink} target="_blank">
          <img src="img/os-logo.png" height="22px" />
        </a>
      </div>
      <div className="digit-enslink">
        <a href={digitENSLink} target="_blank">
          <img src="img/ens-logo.png" height="22px" />
        </a>
      </div>
    </div>
  );
};

const fetchTokenPrices = async (digits) => {
  const tokensAPI = "https://api.reservoir.tools/tokens/v4";

  console.log("fetching tokens");

  const chunkSize = 20;
  const chunks = [];

  for (let i = 0; i < Object.keys(digits).length; i += chunkSize) {
    const chunk = Object.keys(digits).slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  const requests = [];

  for (const chunk of chunks) {
    const request = `${tokensAPI}`;
    for (let i = 0; i < chunk.length; i++) {
      const symbol = i === 0 ? "?" : "&";
      request += `${symbol}tokens=0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85:${chunk[i]}`;
    }
    requests.push(request);
  }

  const results = await Promise.all(
    requests.map(async (request) => {
      const res = await fetch(request);
      return await res.json();
    })
  );
  console.log("results", results);
  return results;
};

function filterList() {
  var count = 0;
  for (var nameHash in digits) {
    var digitVisible = true;
    if (
      $("#7-digits-filter").is(":checked") &&
      String(digits[nameHash].name).length > 7
    ) {
      digitVisible = false;
    }
    if (
      $("#pre-punk-filter").is(":checked") &&
      digits[nameHash].id > PRE_PUNK_CUT_OFF
    ) {
      digitVisible = false;
    }
    if ($("#buy-now-filter").is(":checked") && digits[nameHash].price <= 0) {
      digitVisible = false;
    }
    if ($("#available-filter").is(":checked") && digits[nameHash].price >= 0) {
      digitVisible = false;
    }

    if (digitVisible) {
      $("#" + nameHash).show();
      count++;
    } else {
      $("#" + nameHash).hide();
    }
  }

  updateListLengthInfo(count);
}

function getDigitHash(digitName) {
  const labelHash = utils.keccak256(utils.toUtf8Bytes(digitName));
  const tokenId = BigNumber.from(labelHash).toString();
  return tokenId;
}

function getCellColor(digitPrice) {
  var cellColor = "#ffffff";
  if (digitPrice < 0) {
    cellColor = "#b8e6c2";
  } else if (digitPrice > 0) {
    cellColor = "#a5c8ec";
  }
  return cellColor;
}

function getPriceLabel(digitPrice) {
  return digitPrice > 0 ? digitPrice + "Ξ" : "-";
}

const testJson = {
  jsonData: [
    {
      id: 1,
      name: 31415926535897932,
      regdate: "2017-05-10 7:21",
    },
    {
      id: 2,
      name: 6888888,
      regdate: "2017-05-11 20:12",
    },
    {
      id: 8,
      name: "0005555",
      regdate: "2017-05-16 0:08",
    },
    {
      id: 280,
      name: "0988888",
      regdate: "2017-06-12 6:42",
    },
    {
      id: 431,
      name: 5555558,
      regdate: "2017-06-24 3:13",
    },
    {
      id: 576,
      name: "0000520",
      regdate: "2017-07-06 15:05",
    },
  ],
};

export default function Home() {
  const [digits, setDigits] = useState({});
  const [priceQueried, setPriceQueried] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (Object.keys(digits).length === 0) {
        const result = await loadDigits();
        setDigits(result);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (Object.keys(digits).length > 0 && !priceQueried) {
        const digitsCopy = JSON.parse(JSON.stringify(digits));
        console.log("fetchTokenPrices", 1);
        const data = await fetchTokenPrices(digits);
        console.log("fetchTokenPrices", 2);
        for (const key in data.tokens) {
          const nameHash = data.tokens[key].tokenId;

          if (data.tokens[key].floorAskPrice != null) {
            digitsCopy[nameHash].price = data.tokens[key].floorAskPrice;
          } else if (data.tokens[key].name == null) {
            digitsCopy[nameHash].price = -1;
          } else {
            digitsCopy[nameHash].price = 0;
          }
        }
        setDigits(digitsCopy);
        setPriceQueried(true);
        //    localStorage.pricesUpdatedAt = Date.now();
      }
    };

    fetchData();
  }, [digits]);

  // useEffect(() => {
  //   localStorage.digits = JSON.stringify(digits);
  // }, [digits]);

  console.log("render", digits);
  return (
    <div className="container">
      <Head>
        <title>OG Digits Club</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="container">
          <div className="toptitle">
            <h1>OG Digits Club</h1>
            <a href="https://twitter.com/vidpetnft" target="_blank">
              vidpet
            </a>
            {/* <Image src="img/twitter-logo.png" width="22px" height="22px"/> */}
            <p>by</p>
          </div>
          <h2>All the digit ENS names registered in 2017</h2>
          <div className="filterContainer">
            <label className="filterLabel">7 Digits</label>
            <label className="switch">
              <input
                type="checkbox"
                id="7-digits-filter"
                onClick={filterList}
              />
              <span className="slider round"></span>
            </label>
            <label className="filterLabel">Pre Punk:</label>
            <label className="switch">
              <input
                type="checkbox"
                id="pre-punk-filter"
                onClick={filterList}
              />
              <span className="slider round"></span>
            </label>
            <label className="filterLabel">Buy Now:</label>
            <label className="switch">
              <input type="checkbox" id="buy-now-filter" onClick={filterList} />
              <span className="slider round"></span>
            </label>
            <label className="filterLabel">Available:</label>
            <label className="switch">
              <input
                type="checkbox"
                id="available-filter"
                onClick={filterList}
              />
              <span className="slider round"></span>
            </label>
            <div className="listLengthInfo">0 Item</div>
          </div>
          <div className="digitlist">
            {Object.keys(digits).map((nameHash) => {
              const digit = digits[nameHash];

              return (
                <DigitRow
                  key={digit.id}
                  digitId={digit.id}
                  digitName={digit.name}
                  digitPrice={digit.price}
                  digitRegDate={digit.regdate}
                  digitHash={nameHash}
                />
              );
            })}
          </div>
        </div>
      </main>

      <footer>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by <img src="/vercel.svg" alt="Vercel" className="logo" />
        </a>
      </footer>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          background-color: black;
        }
        body {
          background-color: black;
          font-family: "Open Sans";
        }
        .container {
          width: 700px;
          margin: auto;
          background-color: black;
        }
        .toptitle {
          overflow: hidden;
        }

        .toptitle p {
          float: right;
          color: white;
          text-align: center;
          padding: 50px 0px 14px 16px;
          font-size: 12px;
          font-weight: bold;
        }
        .toptitle img {
          float: right;
          width: 22px;
          padding: 50px 0px 15px 10px;
        }
        .toptitle a {
          float: right;
          color: #2aa9e0;
          text-align: center;
          text-decoration: none;
          padding: 50px 0px 14px 0px;
          font-size: 12px;
        }
        .toptitle a:hover {
          color: #1f7ba3;
        }

        .toptitle h1 {
          float: left;
          color: white;
          font-size: 60px;
          padding-top: 30px;
        }

        .container h2 {
          color: white;
          font-size: 20px;
          font-weight: normal;
        }

        .digitlist {
          color: white;
          font-size: 17px;
          padding-top: 10px;
        }

        .digit {
          border-style: solid;
          border-width: 1px;
          border-color: white;
          padding: 5px;
          margin: 10px;
          display: grid;
          grid-template-columns: 8% 36% 16% 26% 5% 5%;
          column-gap: 5px;
        }

        .digit-id {
        }

        .digit-name {
          text-align: right;
          background-color: white;
          color: black;
          padding-right: 5px;
        }

        .digit-price {
          text-align: right;
          padding-right: 15px;
        }

        .digit-regdate {
        }

        .digit-oslink {
        }

        .digit-enslink {
        }

        .filterContainer {
          padding-top: 50px;
        }

        .filterContainer label {
          color: white;
        }

        .filterContainer label {
          color: white;
        }

        .listLengthInfo {
          color: white;
          float: right;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          margin-right: 20px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: 0.4s;
          transition: 0.4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 1px;
          bottom: 1px;
          background-color: white;
          -webkit-transition: 0.4s;
          transition: 0.4s;
        }

        input:checked + .slider {
          background-color: #2196f3;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #2196f3;
        }

        input:checked + .slider:before {
          -webkit-transform: translateX(26px);
          -ms-transform: translateX(26px);
          transform: translateX(26px);
        }

        /* Rounded sliders */
        .slider.round {
          border-radius: 24px;
        }

        .slider.round:before {
          border-radius: 50%;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
