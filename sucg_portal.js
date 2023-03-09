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
    }
  ]

  const swapperAddress = "0xe89bb7725FA2742C4507e307197E09B3dFe387EA"
  const usdcAddressMainnet = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"


  try {
    Sentry.init({
      dsn: "https://81a69411ce0245129199ac7d6bcd514c@o4504656608100352.ingest.sentry.io/4504656610000896",
      // integrations: [new Sentry.CaptureConsoleIntegration(
      //   {
      //     // array of methods that should be captured
      //     // defaults to ['log', 'info', 'warn', 'error', 'debug', 'assert']
      //     levels: ['log', 'info', 'warn', 'error', 'debug', 'assert']
      //   }
      // )]
    });
    console.log("Sentry initialized")
    // Sentry.captureMessage("Initialized Sentry", "info");
  }
  catch (e) {
    console.log("Couldn't load Sentry...", e)
  }
    

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
        break;
      case 'Coinbase':
        provider = ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
        break;
      case 'MetaMask':
        provider = ethereum.providers.find(({ isMetaMask }) => isMetaMask);
        watchSucg()
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
    const selectedProvider = window.ethereum.selectedProvider ?  window.ethereum.selectedProvider : window.ethereum
    const provider = new ethers.providers.Web3Provider(selectedProvider, "any");

    const { chainId } = await provider.getNetwork();
    let sucgInWallet = 0
    let maxUSDToSpend = 1000000

    const accts = await provider.send("eth_requestAccounts", []);

    if (chainId != 137) {
      await switchNetwork();
    }
    try {
      const sucgContract = new ethers.Contract(sucgAddress, erc20ABI, provider);
      sucgInWallet = parseInt(ethers.utils.formatEther(await (await sucgContract.balanceOf(accts[0])).toString()))
    }
    catch (e) {
      console.log("There was a problem reading from the sucg contract (are you on the right network?)", e)
    }

    return { selectedAddress: accts[0], loading: false, sucgInWallet, maxUSDToSpend, provider };
  };

  const switchNetwork = async () => {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }], // 137 for polygon
    });
  };

  let waitingForApproval = false
  let hasFinishedSwapping = false
  
  
  let activeWeb3Providers = getAvailableWeb3Providers();

  // const connectWalletElement = document.getElementById("connectWallet");
  const connectWalletFormElement = document.getElementById("connectWalletForm")
  const formElement = document.getElementById('swapForm')
  const connectStatusMessageElement = document.getElementById("connectStatusMessage")
  const walletAddressElement = document.getElementById("wallet")
  const emailAddressElement = document.getElementById('email')
  const totalSucgElement = document.getElementById("totalSucg")
  const walletDividendsElement = document.getElementById('walletDividends')

  const monthElement = document.getElementById('month')

  // const monthSUCGElement = document.getElementById('monthSUCG')
  // const quarterSUCGElement = document.getElementById('quarterSUCG')
  // const yearSUCGElement = document.getElementById('yearSUCG')

  const sucgAmountToReceiveElement = document.getElementById('sucgAmountToReceive')
  const successMainElement = document.getElementById('successMain')
  const completeHeadingElement = document.getElementById('completeHeading')
  const browserNotSupportedElement = document.getElementById('browserNotSupported')
  const submitEmailSUCGElement = document.getElementById('submitEmailSUCG')
  const emailFormModalElement = document.getElementById('emailFormModal')
  const emailSUCGElement = document.getElementById('emailSUCG')
  const emailRegisteredFlavorElement = document.getElementById('emailRegisteredFlavor')
  const balanceButtonElement = document.getElementById('balanceButton')

  const proposalListOpenElement = document.getElementById('proposalListOpen')
  const proposalListClosedElement = document.getElementById('proposalListClosed')
  const proposalListItemOpenElement = document.getElementById('proposalListItemOpen')
  const proposalListItemClosedElement = document.getElementById('proposalListItemClosed')
  

  const emailButtonElement = document.getElementById('emailButton')
  const closeModalElement = document.getElementById('closeModal')

  const displayOnlyTabsElement = document.getElementById('displayOnlyTabs')
  const displayOnlyContainerElement = document.getElementById('displayOnlyContainer')
  const gatedHeadingElement = document.getElementById('gatedHeading')

  const reportProblemButtonElement = document.getElementById('reportProblemButton')
  const reportProblemFormElement = document.getElementById('reportProblemForm')

  const connectWalletUnhookedElement = document.getElementById('connectWallet-unhooked')
  
  const sucgAddress = "0x0004a86c09ca1dcb6ed7f6e8e45bb9b794c94cb9"
  const backendURL = "https://new.sucuro.co/api/"
  const space = "sucuro.eth"

  let selectedAddress = ""

  closeModalElement.style = "cursor: pointer;"
  emailButtonElement.style = "cursor: pointer;"
  balanceButtonElement.style = "cursor: pointer;"


  formElement.style.display = "none";
  browserNotSupportedElement.style.display = "none"
  proposalListItemOpenElement.style.display = "none"
  proposalListItemClosedElement.style.display = "none"
  proposalListOpenElement.style.overflowX = "hidden"
  proposalListClosedElement.style.overflowX = "hidden"
  // connectWalletUnhookedElement.removeAttribute('href')

  const updateForm = async (response) => {
    // MAKE ASYNCHROUNOUS 
    
    if (response.sucgInWallet > 0) {
      // connectWalletElement.innerHTML = "CONNECTED"
      formElement.style.display = "block";
      walletAddressElement.innerText = formatAddress(response.selectedAddress)
      walletDividendsElement.innerText = formatAddress(response.selectedAddress)
      selectedAddress = response.selectedAddress

      balanceButtonElement.addEventListener('click', () => {
        window.location.href = `https://polygonscan.com/token/0x0004a86c09ca1dcb6ed7f6e8e45bb9b794c94cb9?a=${selectedAddress}`;
      })
      totalSucgElement.innerText = response.sucgInWallet.toLocaleString();

      // monthSUCGElement.innerText = response.sucgInWallet.toLocaleString();
      // quarterSUCGElement.innerText = response.sucgInWallet.toLocaleString();
      // yearSUCGElement.innerText = response.sucgInWallet.toLocaleString();

      connectWalletFormElement.style.display = "none"
      displayOnlyTabsElement.style.display = "none"
      displayOnlyContainerElement.style.display = "none"
      gatedHeadingElement.style.display = "none"
      document.getElementById('web3ProviderSelectorForm').style.display = "none"
      // watchSUCGButtonElement.style.display = "block"
  
      const requestOptions = {
        method: 'GET',
        headers: { 'account': response.selectedAddress },
      };
  
      fetch(backendURL + 'hasRegisteredEmail', requestOptions)
      .then(x => x.json())
      .then(y => {
        // if (!y.startedRegistration) emailFormBlockElement.style.display = "block"
        if (y.confirmed) {
          getRegisteredEmail(response.selectedAddress)
          emailButtonElement.innerText = "CHANGE"
        }
      });

      connectWalletUnhookedElement.innerText = "LOGOUT"
      
      getProposalList("active");
      getProposalList("closed");
    }
    else {
      // connectWalletElement.innerHTML = "CONNECTED"
      walletAddressElement.innerText = response.selectedAddress
      selectedAddress = response.selectedAddress
      connectWalletFormElement.style.display = "none"
      document.getElementById('web3ProviderSelectorForm').style.display = "none"

      
      formElement.style.display = "none";
      browserNotSupportedElement.style.display = "block"
      displayOnlyContainerElement.style.display = "none"
      browserNotSupportedElement.innerHTML = '<h3 class="bold-text-5">This portal is only for SUCG tokenholders.</h3><br/><p class="form-text-2">Please connect another wallet or purchase SUCG.</p>'

      try {
        Sentry.captureMessage(`ISSUE ON MOBILE address: ${selectedAddress} response: ${response} window.eth: ${window.ethereum}`);
      }      
      catch (e) {
        console.log("Issue logging a sentry error, is the client blocking?", e)
      }
    }
  }

  const getProposalsQuery = (itemsToShow, state) => `{proposals(first:${itemsToShow},skip:0,where:{space_in:["${space}"],state:"${state}"},orderBy:"created",orderDirection:desc){id title body choices start end snapshot state author space{id name}}}`;

  const getProposalQuery = (id) => `query Proposal{proposal(id:"${id}"){id title body start end state author created choices scores scores_total}}`
  
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

  const buildBackgroundImageStyle = (piece, total) => {
    return `background-image: linear-gradient(90deg, #a8a8a8 ${((piece / total) * 100).toFixed(1)}%, #d8d8d8 0);border-bottom: 1px solid #d8d8d8;`
  }

  function removeUrls(text) {
    return text.replace(/(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm, '');
  }

  const getProposalList = async (state) => {
    let itemsToShow = 20
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: getProposalsQuery(itemsToShow, state)
      })
    };

    let proposalsRes = await (await fetch(`https://hub.snapshot.org/graphql`, options)).json()

    for (let index = 0; index < proposalsRes.data.proposals.length; index++) {
      var proposal = proposalsRes.data.proposals[index]
      var body = marked.parse(proposal.body).replace(/<[^>]*>/g, ""); 

      var length = 400; 
      var trimmedBody = body.length > length ? body.substring(0, length - 3) + "..." : body.substring(0, length); 
      trimmedBody = removeUrls(trimmedBody)

      const options = {
        method: "post",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: getProposalQuery(proposal.id)
        })
      };

      let res = await (await fetch(`https://hub.snapshot.org/graphql`, options)).json()
      let li = document.createElement('li')
      let voteResults = ''
      let proposalData = res.data.proposal

      let voteUL = ''
      

      if (proposalData.choices) {
        let total = 0
        // get choice total
        for(let choiceIndex = 0; choiceIndex < proposalData.choices.length; choiceIndex++) {
          total += proposalData.scores[choiceIndex]
        }

        let voteLi = ''
        for(let choiceIndex = 0; choiceIndex < proposalData.choices.length; choiceIndex++) {
          let proposalDatascores = proposalData.scores[choiceIndex] ? proposalData.scores[choiceIndex] : 0
          voteLi = `${voteLi}
                    <li class="list-item-5">
                      <div style="${buildBackgroundImageStyle(proposalDatascores, total)}">
                        <div class="w-row">
                          <div class="w-col w-col-6">
                            <div class="text-block-20">${proposalData.choices[choiceIndex]}</div>
                          </div>
                          <div class="w-col w-col-6">
                            <div class="text-block-20">${humanReadableNumber(proposalDatascores)}</div>
                          </div>
                        </div>
                      </div>
                    </li>`
        }
        voteUL = `<ul role="list" class="w-list-unstyled" style="width: 100%; margin-top: 10px; border: 0.5px solid black;">
                    ${voteLi}
                  </ul>`
      }

      // console.log("voteUL:", voteUL)
      // console.log("voteUL contents:", voteUL.innerHTML)
      // console.log("voteUL toString:", voteUL.toString())

      li.innerHTML = `<a href="https://snapshot.org/#/${space}/proposal/${proposal.id}" style="text-decoration:none">
                        <div class="snapshotdividerline"></div>
                        <div class="clickable-div w-row">
                          <div class="w-col w-col-10">
                            <div class="listitemtitle">${proposalData.title}</div> 
                            <div class="listitemdescription">${trimmedBody}</div>
                          </div>
                          <div class="column-7 w-col w-col-2">${voteUL}</div>
                        </div>
                        <div class="snapshotdividerline"></div>
                      </a>`

      if (state == "closed") proposalListClosedElement.append(li) 
      else if (state == "active") proposalListOpenElement.append(li)
    }

  }

  const getRegisteredEmail = async (address) => {
    let t = { method: "GET", headers: { 'Content-Type': 'application/json', 'account': address } };

    let tokenResult = await fetch(backendURL + "requestNewToken", t)
    let tokenJson = await tokenResult.json()

    let y = { method: "GET", headers: { 'Content-Type': 'application/json', 'account': address, 'Authorization' : `Bearer ${tokenJson}` } };

    let emailResult = await fetch(backendURL + "getEmail", y)
    let emailJson = await emailResult.json()

    if (emailJson.email) {
      emailAddressElement.innerText = emailJson.email
      emailRegisteredFlavorElement.innerText = "E-mail Address Registered"
    }
    else {
      emailAddressElement.innerText = "None"
      // emailRegisteredFlavorElement.innerText = "No E-mail Address Registered"
    }


  }

  const registerEmail = async () => {
    const tokenOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        account: selectedAddress,
      },
    };

    const resp = await fetch(
      `${backendURL}requestNewToken`,
      tokenOptions
    );
    const token = await resp.json();

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        account: selectedAddress,
        email: emailSUCGElement.value,
      }),
    };
    fetch(backendURL + "registerEmail", requestOptions);
  }

  const connectPressed = async (listElm) => {
    if (activeWeb3Providers && activeWeb3Providers.length === 1) {
      let response = await connectToWeb3(activeWeb3Providers[0])
      if (response.selectedAddress) {
        await updateForm(response)
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
              await updateForm(response)
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
      // connectWalletElement.style.display = "none"
      connectWalletFormElement.style.display = "none"
      displayOnlyTabsElement.style.display = "none"
      displayOnlyContainerElement.style.display = "none"
      gatedHeadingElement.style.display = "none"
      browserNotSupportedElement.style.display = "block"
    }
  }

  const watchSucg = async (event) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    let test = await provider.send('metamask_watchAsset', {
        "type": "ERC20",
        "options": {
          "address": sucgAddress,
          "symbol": 'SUCG',
          "decimals": 18
        },
      })
  }

  const toggleModal = () => {
    if (emailFormModalElement.style.display === "block") {
      emailFormModalElement.style.display = "none";
    } else {
      emailFormModalElement.style.display = "block";
    }
  }
  
  const toggleElementVisibility = (element) => {
    if (element.style.display === "block") {
      element.style.display = "none";
    } else {
      element.style.display = "block";
    }
  }

  function formatAddress(str) {
    let firstSix = str.substring(0, 6);
    let lastFour = str.substring(str.length - 4);
    return firstSix + '...' + lastFour;
  }
  

  // document.getElementById('web3ProviderSelector').style.display = "none"
  document.getElementById('web3ProviderSelectorForm').style.display = "none"
  completeHeadingElement.style.display = "none"

  function currentMonthAndYear() {
    let date = new Date();
    let month = date.toLocaleString("default", { month: "long" });
    let year = date.getFullYear();
    return `${month} ${year}`;
  }

  monthElement.innerText = currentMonthAndYear()

  window.onload = function() {
    browserDetect()

    emailButtonElement.addEventListener("click", () => {
      // toggleModal()
      toggleElementVisibility(emailFormModalElement)
    })

    // connectWalletElement.addEventListener("click", async () => {
    //   await connectPressed('web3ProviderSelector')
    // });

    reportProblemButtonElement.addEventListener('click', async () => {
      toggleElementVisibility(reportProblemFormElement)
    })
    
    connectWalletFormElement.addEventListener("click", async () => {
      await connectPressed('web3ProviderSelectorForm')
    });

    submitEmailSUCGElement.addEventListener('click', async () => {
      await registerEmail()
      // toggleModal()
      toggleElementVisibility(emailFormModalElement)
    })

    closeModalElement.addEventListener('click', () => {
      emailFormModalElement.style.display = "none";
    })

    connectWalletUnhookedElement.addEventListener('click', () => {

    })
    
  }