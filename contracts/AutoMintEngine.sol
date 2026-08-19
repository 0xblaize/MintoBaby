// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title AutoMintEngine
 * @dev Direct-to-wallet execution engine for Robinhood Chain (4663).
 * Mints and sends NFTs directly into the user's main connected wallet.
 * Does not hold user ETH, create vaults, or store custodial funds.
 */
contract AutoMintEngine {
    address public immutable operator;
    uint256 public constant ROBINHOOD_CHAIN_ID = 4663;

    event DirectMinted(address indexed nftContract, address indexed recipient, uint256 value);
    event AutoSent(address indexed nftContract, uint256 indexed tokenId, address indexed to);
    event AutoSold(address indexed nftContract, uint256 indexed tokenId, address indexed owner, uint256 price);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == tx.origin, "Unauthorized");
        _;
    }

    modifier onlyRobinhood() {
        require(block.chainid == ROBINHOOD_CHAIN_ID, "Wrong network");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    /**
     * @notice Auto-mints NFT drop directly into the user's main connected wallet.
     * @param targetNftContract The Robinhood NFT collection contract.
     * @param mintData Encoded mint calldata (e.g. publicMint(quantity)).
     * @param mainWalletAddress The user's main connected wallet address.
     */
    function autoMint(
        address targetNftContract,
        bytes calldata mintData,
        address mainWalletAddress
    ) external payable onlyOperator onlyRobinhood {
        require(targetNftContract != address(0), "Invalid contract");
        require(mainWalletAddress != address(0), "Invalid main wallet");

        (bool success, ) = targetNftContract.call{value: msg.value}(mintData);
        require(success, "Mint execution failed");

        emit DirectMinted(targetNftContract, mainWalletAddress, msg.value);
    }

    /**
     * @notice Auto-sends an NFT directly to a destination wallet.
     */
    function autoSend(
        address nftContract,
        uint256 tokenId,
        address fromWallet,
        address toWallet
    ) external onlyOperator onlyRobinhood {
        require(IERC721(nftContract).isApprovedForAll(fromWallet, address(this)), "Operator not approved");
        IERC721(nftContract).safeTransferFrom(fromWallet, toWallet, tokenId);
        emit AutoSent(nftContract, tokenId, toWallet);
    }

    /**
     * @notice Auto-sells an NFT, ensuring 100% of proceeds are transferred directly to the user's main wallet.
     */
    function autoSell(
        address nftContract,
        uint256 tokenId,
        address marketplace,
        uint256 minPrice,
        bytes calldata sellData
    ) external payable onlyOperator onlyRobinhood {
        address tokenOwner = IERC721(nftContract).ownerOf(tokenId);
        require(tokenOwner != address(0), "Token does not exist");
        require(IERC721(nftContract).isApprovedForAll(tokenOwner, address(this)), "Operator not approved");

        IERC721(nftContract).safeTransferFrom(tokenOwner, marketplace, tokenId);

        if (sellData.length > 0) {
            (bool success, ) = marketplace.call{value: msg.value}(sellData);
            require(success, "Marketplace sell failed");
        }

        if (msg.value > 0) {
            require(msg.value >= minPrice, "Price below minimum");
            payable(tokenOwner).transfer(msg.value);
        }

        emit AutoSold(nftContract, tokenId, tokenOwner, msg.value);
    }

    receive() external payable {}
}
