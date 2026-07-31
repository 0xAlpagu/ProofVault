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

/* ---------- Network handling ---------- */

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

function describeNetwork(chainId) {
    if (chainId === GIWA_CHAIN_ID) return "GIWA Sepolia";
    return "Unsupported network";
}

async function connectWallet() {
    if (!window.ethereum) {
        alert("No EVM wallet detected.");
        return;
    }
    try {
        await ensureGiwaNetwork();
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const address = await signer.getAddress();
        walletAddress.textContent = address;

        const network = await provider.getNetwork();
        networkName.textContent = describeNetwork(network.chainId) + " (" + network.chainId + ")";

        contract = new ethers.Contract(contractAddress, contractABI, signer);
        loadProofs();
    } catch (err) {
        console.error(err);
        status.textContent = "Could not connect wallet.";
        status.classList.add("error");
    }
}

connectBtn.addEventListener("click", connectWallet);
storeProof.addEventListener("click", addProof);

/* ---------- Contract interaction ---------- */

async function addProof() {
    if (!contract) return;
    try {
        status.classList.remove("error");
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
    } catch (err) {
        console.error(err);
        status.textContent = "Transaction failed.";
        status.classList.add("error");
    }
}

async function loadProofs() {
    proofList.innerHTML = "";
    const count = await contract.getProofCount();
    proofCount.textContent = count;

    if (count == 0) {
        proofList.innerHTML = "<p class='empty'>No proofs found.</p>";
        updateTicker([]);
        return;
    }

    const recentTitles = [];

    for (let i = count - 1; i >= 0; i--) {
        const proof = await contract.getProof(i);
        const card = document.createElement("div");
        card.className = "proof-card";
        card.innerHTML = `
            <h3>${proof[1]}</h3>
            <p>${proof[2]}</p>
            <p><span class="meta-label">Category</span><br>${proof[3]}</p>
            <p><span class="meta-label">IPFS</span><span class="hash-value mono">${proof[4]}</span></p>
            <p><span class="meta-label">Sealed</span><br>${new Date(proof[5] * 1000).toLocaleString()}</p>
        `;
        proofList.appendChild(card);

        if (recentTitles.length < 6) recentTitles.push(proof[1]);
    }

    updateTicker(recentTitles);
}

/* ---------- Ticker ---------- */

const tickerTrack = document.getElementById("tickerTrack");
const tickerTrackDupe = document.getElementById("tickerTrackDupe");

const defaultTickerItems = [
    "GIWA SEPOLIA",
    "IMMUTABLE LEDGER",
    "NO ADMIN KEYS",
    "WRITE ONCE",
    "PROVABLE FOREVER"
];

function updateTicker(items) {
    const content = items.length > 0 ? items : defaultTickerItems;
    const html = content.map(item => `<span>${item}</span>`).join("");
    tickerTrack.innerHTML = html;
    tickerTrackDupe.innerHTML = html;
}

updateTicker([]);

/* ---------- Carousel ---------- */

const carouselTrack = document.getElementById("carouselTrack");
const carouselDots = document.getElementById("carouselDots");
const howCards = carouselTrack ? Array.from(carouselTrack.children) : [];
let activeSlide = 0;
let autoplayTimer = null;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function buildDots() {
    howCards.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.setAttribute("aria-label", "Go to step " + (i + 1));
        if (i === 0) dot.classList.add("active");
        dot.addEventListener("click", () => goToSlide(i));
        carouselDots.appendChild(dot);
    });
}

function goToSlide(index) {
    activeSlide = index;
    const card = howCards[index];
    if (card) {
        carouselTrack.scrollTo({ left: card.offsetLeft - carouselTrack.offsetLeft, behavior: "smooth" });
    }
    Array.from(carouselDots.children).forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
    });
}

function startAutoplay() {
    if (prefersReducedMotion || howCards.length < 2) return;
    autoplayTimer = setInterval(() => {
        goToSlide((activeSlide + 1) % howCards.length);
    }, 4500);
}

function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
}

if (carouselTrack && howCards.length > 0) {
    buildDots();
    startAutoplay();
    carouselTrack.addEventListener("mouseenter", stopAutoplay);
    carouselTrack.addEventListener("mouseleave", startAutoplay);
    carouselTrack.addEventListener("touchstart", stopAutoplay, { passive: true });
}
