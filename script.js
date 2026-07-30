let provider;
let signer;
let contract;

const connectBtn = document.getElementById("connectWallet");

const walletAddress = document.getElementById("walletAddress");
const networkName = document.getElementById("networkName");
const contractAddressText = document.getElementById("contractAddress");
const proofCount = document.getElementById("proofCount");

const title = document.getElementById("title");
const description = document.getElementById("description");
const category = document.getElementById("category");
const ipfsHash = document.getElementById("ipfsHash");

const storeProof = document.getElementById("storeProof");

const proofList = document.getElementById("proofList");

const status = document.getElementById("status");

contractAddressText.textContent = contractAddress;

const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_ID_HEX = "0x" + GIWA_CHAIN_ID.toString(16);

async function ensureGiwaNetwork() {
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId === GIWA_CHAIN_ID_HEX) return;

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: GIWA_CHAIN_ID_HEX }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: GIWA_CHAIN_ID_HEX,
                    chainName: "GIWA Sepolia",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://sepolia-rpc.giwa.io"],
                    blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
                }]
            });
        } else {
            throw switchError;
        }
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        alert("No EVM wallet detected.");
        return;
    }
    await ensureGiwaNetwork();
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    walletAddress.textContent = address;
    const network = await provider.getNetwork();
    networkName.textContent =
        (network.chainId === GIWA_CHAIN_ID ? "GIWA Sepolia" : "Unsupported network") +
        " (" + network.chainId + ")";
    contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
    );
    loadProofs();
}

}

connectBtn.addEventListener(
    "click",
    connectWallet
);

storeProof.addEventListener(
    "click",
    addProof
);

async function addProof() {

    if (!contract) return;

    try {

        status.textContent = "Sending transaction...";

        const tx = await contract.addProof(

            title.value,

            description.value,

            category.value,

            ipfsHash.value

        );

        await tx.wait();

        status.textContent = "Proof stored successfully.";

        title.value = "";

        description.value = "";

        category.value = "";

        ipfsHash.value = "";

        loadProofs();

    }

    catch (err) {

        console.error(err);

        status.textContent = "Transaction failed.";

    }

}

async function loadProofs() {

    proofList.innerHTML = "";

    const count =
        await contract.getProofCount();

    proofCount.textContent = count;

    if (count == 0) {

        proofList.innerHTML =
            "<p class='empty'>No proofs found.</p>";

        return;

    }

    for (let i = 0; i < count; i++) {

        const proof =
            await contract.getProof(i);

        const card =
            document.createElement("div");

        card.className = "card";

        card.innerHTML = `

<h3>${proof[1]}</h3>

<p>${proof[2]}</p>

<p><strong>Category:</strong> ${proof[3]}</p>

<p><strong>IPFS:</strong><br>${proof[4]}</p>

<p><strong>Date:</strong><br>${new Date(proof[5] * 1000).toLocaleString()}</p>

`;

        proofList.appendChild(card);

    }

}
