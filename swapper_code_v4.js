const swapperABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "swap",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRemainingInPrivateSale",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }]

const erc20ABI = [
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "spender",
              "type": "address"
          },
          {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
          }
      ],
      "name": "approve",
      "outputs": [
          {
              "internalType": "bool",
              "name": "",
              "type": "bool"
          }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const swapperAddress = "0xe89bb7725FA2742C4507e307197E09B3dFe387EA"
const usdcAddressMainnet = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

const getAvailableWeb3Providers = () => {
  try {
    const { ethereum } = window;

    let provider;

    if (ethereum.providers) {
      let allProviders = ethereum.providers
      let foundProviders = []

      for (let i = 0; i < allProviders.length; i++) {
        let providerCheck = allProviders[i]
        if (providerCheck.isTrustWallet) foundProviders.push('Trust')
        else if (providerCheck.isCoinbaseWallet) foundProviders.push('Coinbase')
        else if (providerCheck.isMetaMask && !foundProviders.includes('MetaMask')) foundProviders.push('MetaMask')
      }

      console.log("Multiple providers detected.", foundProviders)
      return foundProviders
    }
    else if (ethereum) {
      if (ethereum.isBraveWallet) return ['Brave']
      else if (ethereum.isTrustWallet) return ['Trust']
      else if (ethereum.isCoinbaseWallet) return ['Coinbase']
      else if (ethereum.isMetaMask) return ['MetaMask']
    }
    else return null
  }
  catch (e) {
    console.log("Web3 not supported.", e)
    return null
  }
}

const activateInjectedProvider = (providerName) => {
  const { ethereum } = window;

  if (!ethereum.providers) {
    return undefined;
  }

  let provider;

  switch (providerName) {
    case 'Trust':
      provider = ethereum.providers.find(({ isTrustWallet }) => isTrustWallet);
      console.log("set to Trust Wallet")
      break;
    case 'Coinbase':
      provider = ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
      console.log("set to coinbase")
      break;
    case 'MetaMask':
      provider = ethereum.providers.find(({ isMetaMask }) => isMetaMask);
      console.log("set to MetaMask")
      break;
    default:
      return;
  }

  if (provider) {
    ethereum.setSelectedProvider(provider);
  }
}


const connectToWeb3 = async (type) => {
  activateInjectedProvider(type)
  console.log("type", type)
  const selectedProvider = window.ethereum.selectedProvider ?  window.ethereum.selectedProvider : window.ethereum
  console.log("selectedProvider", selectedProvider)
  const provider = new ethers.providers.Web3Provider(selectedProvider, "any");
  const usdcContract = new ethers.Contract(usdcAddressMainnet, erc20ABI, provider);

  const { chainId } = await provider.getNetwork();
  let showPrompt = false;
  let amountOfSUCGLeft = 0
  let maxUSDToSpend = 1000000
  let usdcBalance = 0

  console.log("chainId", chainId)
  const accts = await provider.send("eth_requestAccounts", []);

  if (chainId != 1) {
    await switchNetwork();
    showPrompt = true;
  }
  else {
    try {
      const swapperContract = new ethers.Contract(swapperAddress, swapperABI, provider);
      amountOfSUCGLeft = parseInt(ethers.utils.formatEther(await (await swapperContract.getRemainingInPrivateSale()).toString()))
      maxUSDToSpend = parseInt(ethers.utils.formatEther(await (await swapperContract.getRemainingInPrivateSale()).toString())) / 4

      usdcBalance = `$${ethers.utils.formatUnits(await (await usdcContract.balanceOf(accts[0])).toString(), await usdcContract.decimals())}`

      return { selectedAddress: accts[0], loading: false, showPrompt, amountOfSUCGLeft, maxUSDToSpend, provider, usdcBalance };
    }
    catch (e) {
      console.log("There was a problem reading from the swap contract (are you on the right network?)", e)
    }
  }

};

const switchNetwork = async () => {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x1" }], // 5 for testnet, 1 for mainnet 
  });
};

let waitingForApproval = false
let hasFinishedSwapping = false

const handleSwap = async (event) => {
  waitingForApproval = true;
  sucgAmountToReceiveElement.innerText = `You will receive ${parseInt(sucgElement.value).toLocaleString()} SUCG.`
  //setSucgEstimateAmount(fields.sucg);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const usdcContract = new ethers.Contract(usdcAddressMainnet, erc20ABI, provider);
  const usdcContractWithSigner = usdcContract.connect(signer);
  const swapperContract = new ethers.Contract(swapperAddress, swapperABI, provider);
  const swapperContractWithSigner = swapperContract.connect(signer);

  const tokenAmountInUSDC = ethers.utils.parseUnits(`${parseInt(usdcElement.value.replace(/,/g, ''), 10)}`, 18);
  const approveTx = await usdcContractWithSigner.approve(swapperAddress,tokenAmountInUSDC);

  console.log("approveTx", approveTx);
  await approveTx.wait();

  const swapTx = await swapperContractWithSigner.swap(tokenAmountInUSDC);
  console.log("swapTx", swapTx);
  await swapTx.wait();
  waitingForApproval = false
  hasFinishedSwapping = true
  updateFormFinished()
};

let activeWeb3Providers = getAvailableWeb3Providers();
console.log(activeWeb3Providers)

const connectWalletFormElement = document.getElementById("connectWalletForm")
const formElement = document.getElementById('swapForm')
const connectStatusMessageElement = document.getElementById("connectStatusMessage")
const walletAddressElement = document.getElementById("wallet")
// const totalSucgElement = document.getElementById("totalSucg")
const usdcElement = document.getElementById("usdc")
const sucgElement = document.getElementById("sucg")
const swapElement = document.getElementById('swap')
const sucgAmountToReceiveElement = document.getElementById('sucgAmountToReceive')
const successMainElement = document.getElementById('successMain')
const completeHeadingElement = document.getElementById('completeHeading')
const browserNotSupportedElement = document.getElementById('browserNotSupported')
const sucgStatusBarElement = document.getElementById('sucgStatusBar')
const sucgSupplyLeftElement = document.getElementById('sucgSupplyLeft')

const usdcBalanceElement = document.getElementById('usdcBalance')

let totalSucgLeft = 200000
const totalSucgToSell = 8000000

formElement.style.display = "none";
browserNotSupportedElement.style.display = "none"

const updateForm = (response) => {
  formElement.style.display = "";
  walletAddressElement.innerText = response.selectedAddress
  usdcBalanceElement.innerText = response.usdcBalance
  // totalSucgElement.innerText = response.amountOfSUCGLeft.toLocaleString();
  console.log("amount left", response.amountOfSUCGLeft)
  console.log("totalSucgToSell", totalSucgToSell)
  sucgStatusBarElement.style = buildBackgroundImageStyle(response.amountOfSUCGLeft, totalSucgToSell)
  sucgStatusBarElement.innerHTML = `<div class="statustotal">${response.amountOfSUCGLeft.toLocaleString()}</div>`

  totalSucgLeft = response.amountOfSUCGLeft
  connectWalletFormElement.style.display = "none"
  document.getElementById('web3ProviderSelectorForm').style.display = "none"
}

const updateFormFinished = () => {
  document.getElementById("loading").style.display = "none";
  successMainElement.innerText = "Successfully swapped " + parseInt(usdcElement.value).toLocaleString() + " USDC for " + parseInt(sucgElement.value).toLocaleString() + " SUCG."
  sucgAmountToReceiveElement.innerHTML = "<a href='https://polygonscan.com/token/0x0004a86c09ca1dcb6ed7f6e8e45bb9b794c94cb9?a=" + walletAddressElement.innerText + "'>Click here to view your SUCG balance on Polyscan</a>"
  completeHeadingElement.style.display = ""
}

const connectPressed = async (listElm) => {
  if (activeWeb3Providers && activeWeb3Providers.length === 1) {
    let response = await connectToWeb3(activeWeb3Providers[0])
    if (response.selectedAddress) {
      updateForm(response)
    } 
  }
  else if (activeWeb3Providers && activeWeb3Providers.length > 1) {
    let listElement = document.getElementById(listElm)

    if (listElement.innerHTML.trim() === "") {
      for (let i = 0; i < activeWeb3Providers.length; i++) {
        let li = document.createElement("li")
        li.style = "cursor: pointer;"
        li.innerHTML = `CONNECT WITH ${activeWeb3Providers[i].toUpperCase()} WALLET`
        li.addEventListener("click", async () => { 
          let response = await connectToWeb3(activeWeb3Providers[i])
          if (response.selectedAddress) {
            updateForm(response)
          } 
          listElement.style.display = "none";
        })
        listElement.append(li);
      }
    }

    if (listElement.style.display === "none"){
      listElement.style.display = "";
    }
    else if (listElement.style.display == ""){
      listElement.style.display = "none";
    }
  }
}

const buildBackgroundImageStyle = (piece, total) => {
  return `background-image: linear-gradient(90deg, rgba(158, 42, 40, 0.42) ${((piece / total) * 100).toFixed(1)}%, #d8d8d8 0);border-bottom: 1px solid #d8d8d8;`
}

function humanReadableNumber(num) {
  if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'b';
  } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'm';
  } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
  } else {
      return num;
  }
}
function addCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// !isEdge && !isSafari && !isIE
let browserNotSupported = false
browserDetect = async () => {
  var result = bowser.getParser(window.navigator.userAgent);
  // if( result.parsedResult.browser.name == 'Microsoft Edge' || result.parsedResult.browser.name == 'Safari' ) browserNotSupported = true
  var isBrave = false
  try {
    isBrave = await navigator.brave.isBrave()
    console.log("brave")
  }
  catch {
    console.log("not brave")
  }

  if (!window.ethereum && !isBrave || !window.ethereum && result.parsedResult.browser.name == 'Safari') browserNotSupported = true
  if (browserNotSupported) {
    formElement.style.display = "none";
    connectWalletFormElement.style.display = "none"
    browserNotSupportedElement.style.display = "block"
  }
}

function formatWithComma(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

document.getElementById('web3ProviderSelectorForm').style.display = "none"
completeHeadingElement.style.display = "none"


  
const toggleElementVisibility = (element) => {
  if (element.style.display === "block") {
    element.style.display = "none";
  } else {
    element.style.display = "block";
  }
}

const reportProblemButtonElement = document.getElementById('reportProblemButton')
const reportProblemFormElement = document.getElementById('reportProblemForm')

const updateRemainingInSale = async () => {
    // Replace the values below with your Alchemy API key and the contract address
    const apiKey = '9j5elMdVeZiDjpGRQoBtgZVBwcl2hMeF';
  
    // Create a new instance of the ethers.js library with Alchemy as the provider
    const provider = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.alchemyapi.io/v2/${apiKey}`);

    // Create a new instance of the contract object using the ABI and address of the contract
    const contract = new ethers.Contract(swapperAddress, swapperABI, provider);

    // Call the getRemainingInPrivateSale function on the contract and convert the result to a human-readable number
    const remaining = await contract.getRemainingInPrivateSale();
    const remainingHumanReadable = ethers.utils.formatEther(remaining).slice(0, -2);

    // Update the innerText of the element with the human-readable number
    sucgSupplyLeftElement.innerText = addCommas(remainingHumanReadable);

    console.log("remaining tokens: ", addCommas(remainingHumanReadable))
}

window.onload = function() {
  browserDetect()
  updateRemainingInSale()
  usdcElement.value = '5,000'
  usdcElement.min = 5000
  sucgElement.value = '5,000'
  sucgElement.min = 5000
  
  connectWalletFormElement.addEventListener("click", async () => {
    await connectPressed('web3ProviderSelectorForm')
  });
  
  swapElement.addEventListener("click", async () => {
    await handleSwap()
  })

  
  reportProblemButtonElement.addEventListener('click', async () => {
    toggleElementVisibility(reportProblemFormElement)
  })
  
  usdcElement.addEventListener('change', (event) => {
    let parsedVal = parseInt(usdcElement.value)
    if (parsedVal > (totalSucgLeft)) {
      usdcElement.value = formatWithComma(totalSucgLeft)
      sucgElement.value = formatWithComma(totalSucgLeft)
    }
    else if (parsedVal < 5000) {
      usdcElement.value = formatWithComma(5000)
      sucgElement.value = formatWithComma(5000)
    }
    else {
      sucgElement.value = formatWithComma(parsedVal)
      usdcElement.value = formatWithComma(parsedVal)
    } 
  })
  sucgElement.addEventListener('change', (event) => {
    let parsedVal = parseInt(sucgElement.value)
    if (parsedVal > totalSucgLeft) {
      sucgElement.value = formatWithComma(totalSucgLeft)
      usdcElement.value = formatWithComma(totalSucgLeft)
    }
    else if (parsedVal < 5000) {
      sucgElement.value = formatWithComma(5000)
      usdcElement.value = formatWithComma(5000)
    }
    else {
      sucgElement.value = formatWithComma(parsedVal)
      usdcElement.value = formatWithComma(parsedVal)
    }
  })
}