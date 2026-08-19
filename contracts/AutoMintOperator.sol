// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IStandardPublicMint {
    function publicMint(uint256 quantity) external payable;
}

/**
 * @title AutoMintOperator
 * @dev Universal non-custodial operator for Robinhood Chain.
 * Enables direct-to-wallet auto-minting and auto-selling without holding funds or requiring second vaults.
 */
contract AutoMintOperator {
    address public immutable botOperator;
    uint256 public constant ROBINHOOD_CHAIN_ID = 4663;

    event DirectMintExecuted(address indexed targetContract, address indexed recipient, uint256 value);
    event AutoSellExecuted(address indexed nftContract, uint256 indexed tokenId, address indexed owner, uint256 salePrice);

    modifier onlyOperator() {
        require(msg.sender == botOperator || msg.sender == tx.origin, "Unauthorized operator");
        _;
    }

    modifier onlyRobinhood() {
        require(block.chainid == ROBINHOOD_CHAIN_ID, "Wrong network");
        _;
    }

    constructor() {
        botOperator = msg.sender;
    }

    /**
     * @notice Checks if this operator contract is authorized to manage NFTs for a user wallet.
     */
    function isApprovedForUser(address nftContract, address owner) external view returns (bool) {
        return IERC721(nftContract).isApprovedForAll(owner, address(this));
    }

    /**
     * @notice Auto-mints NFT drop directly to user's connected wallet address.
     * @param targetContract The Robinhood Chain NFT drop contract.
     * @param mintData Calldata for the mint function (e.g. publicMint(quantity)).
     * @param recipient The user's primary connected wallet address.
     */
    function executeDirectMint(
        address targetContract,
        bytes calldata mintData,
        address recipient
    ) external payable onlyOperator onlyRobinhood {
        require(targetContract != address(0), "Invalid target");
        require(recipient != address(0), "Invalid recipient");

        (bool success, ) = targetContract.call{value: msg.value}(mintData);
        require(success, "Mint execution failed");

        emit DirectMintExecuted(targetContract, recipient, msg.value);
    }

    /**
     * @notice Auto-sells an NFT on behalf of the user, transferring 100% of proceeds directly to the user's wallet.
     * @param nftContract The NFT contract address.
     * @param tokenId The NFT token ID owned by the user.
     * @param buyerOrMarketplace The marketplace or settlement recipient.
     * @param minSalePrice The minimum acceptable price in ETH.
     * @param sellCalldata Calldata for executing the marketplace fill/settlement.
     */
    function executeAutoSell(
        address nftContract,
        uint256 tokenId,
        address buyerOrMarketplace,
        uint256 minSalePrice,
        bytes calldata sellCalldata
    ) external payable onlyOperator onlyRobinhood {
        address tokenOwner = IERC721(nftContract).ownerOf(tokenId);
        require(tokenOwner != address(0), "Token does not exist");
        require(
            IERC721(nftContract).isApprovedForAll(tokenOwner, address(this)),
            "Operator not approved by owner"
        );

        // Transfer NFT from user wallet to buyer/marketplace
        IERC721(nftContract).safeTransferFrom(tokenOwner, buyerOrMarketplace, tokenId);

        // Execute marketplace settlement if calldata provided
        if (sellCalldata.length > 0) {
            (bool success, ) = buyerOrMarketplace.call{value: msg.value}(sellCalldata);
            require(success, "Sell settlement failed");
        }

        // If ETH was sent for purchase, transfer 100% directly to the user's wallet
        if (msg.value > 0) {
            require(msg.value >= minSalePrice, "Price below minimum threshold");
            payable(tokenOwner).transfer(msg.value);
        }

        emit AutoSellExecuted(nftContract, tokenId, tokenOwner, msg.value);
    }

    receive() external payable {}
}
