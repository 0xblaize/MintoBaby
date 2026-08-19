// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMintTo {
    function mintTo(address recipient, uint256 quantity) external payable;
}

interface IPublicMintTo {
    function publicMint(address recipient, uint256 quantity) external payable;
}

/**
 * @title AutoMintExecutor
 * @notice Constrained Robinhood Chain executor for recipient-aware mint adapters.
 * @dev A keeper may trigger an approved intent, but cannot choose arbitrary targets or calldata.
 */
contract AutoMintExecutor {
    uint256 public constant ROBINHOOD_CHAIN_ID = 4663;
    bytes32 public constant ADAPTER_MINT_TO = keccak256("MINT_TO(address,uint256)");
    bytes32 public constant ADAPTER_PUBLIC_MINT_TO = keccak256("PUBLIC_MINT_TO(address,uint256)");

    address public owner;
    address public operator;
    bool public paused;
    uint256 public nonce;

    struct TargetConfig {
        bool enabled;
        bytes32 adapter;
        uint256 maxQuantity;
        uint256 maxValue;
    }

    mapping(address => TargetConfig) public targets;
    mapping(uint256 => bool) public usedNonces;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);
    event PauseUpdated(bool paused);
    event TargetConfigured(address indexed target, bytes32 indexed adapter, uint256 maxQuantity, uint256 maxValue, bool enabled);
    event MintExecuted(bytes32 indexed intentHash, address indexed target, address indexed recipient, bytes32 adapter, uint256 quantity, uint256 value, uint256 intentNonce);
    event ETHWithdrawn(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    modifier onlyRobinhood() {
        require(block.chainid == ROBINHOOD_CHAIN_ID, "Wrong network");
        _;
    }

    constructor(address initialOperator) {
        require(initialOperator != address(0), "Invalid operator");
        owner = msg.sender;
        operator = initialOperator;
        emit OwnershipTransferred(address(0), msg.sender);
        emit OperatorUpdated(address(0), initialOperator);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid operator");
        address previousOperator = operator;
        operator = newOperator;
        emit OperatorUpdated(previousOperator, newOperator);
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
        emit PauseUpdated(nextPaused);
    }

    function configureTarget(
        address target,
        bytes32 adapter,
        uint256 maxQuantity,
        uint256 maxValue,
        bool enabled
    ) external onlyOwner {
        require(target != address(0), "Invalid target");
        require(adapter == ADAPTER_MINT_TO || adapter == ADAPTER_PUBLIC_MINT_TO, "Unsupported adapter");
        require(maxQuantity > 0, "Invalid quantity limit");
        require(maxValue > 0, "Invalid value limit");
        targets[target] = TargetConfig(enabled, adapter, maxQuantity, maxValue);
        emit TargetConfigured(target, adapter, maxQuantity, maxValue, enabled);
    }

    function executeMintTo(
        address target,
        address recipient,
        uint256 quantity,
        uint256 value,
        uint256 deadline,
        uint256 expectedNonce,
        bytes32 phaseHash
    ) external payable onlyOperator onlyRobinhood returns (bytes32 intentHash) {
        return _executeMintTo(target, recipient, quantity, value, deadline, expectedNonce, phaseHash);
    }

    function executeMintToByRecipient(
        address target,
        address recipient,
        uint256 quantity,
        uint256 value,
        uint256 deadline,
        uint256 expectedNonce,
        bytes32 phaseHash
    ) external payable onlyRobinhood returns (bytes32 intentHash) {
        require(msg.sender == recipient, "Recipient caller required");
        return _executeMintTo(target, recipient, quantity, value, deadline, expectedNonce, phaseHash);
    }

    function _executeMintTo(
        address target,
        address recipient,
        uint256 quantity,
        uint256 value,
        uint256 deadline,
        uint256 expectedNonce,
        bytes32 phaseHash
    ) internal returns (bytes32 intentHash) {
        require(!paused, "Paused");
        require(block.timestamp <= deadline, "Expired");
        require(expectedNonce == nonce, "Invalid nonce");
        require(!usedNonces[expectedNonce], "Nonce used");
        require(recipient != address(0), "Invalid recipient");
        require(msg.value == value, "Value mismatch");

        TargetConfig memory config = targets[target];
        require(config.enabled, "Target disabled");
        require(config.adapter == ADAPTER_MINT_TO || config.adapter == ADAPTER_PUBLIC_MINT_TO, "Unsupported adapter");
        require(quantity > 0 && quantity <= config.maxQuantity, "Quantity exceeds limit");
        require(value <= config.maxValue, "Value exceeds limit");

        intentHash = keccak256(abi.encode(
            address(this),
            block.chainid,
            target,
            recipient,
            config.adapter,
            quantity,
            value,
            deadline,
            expectedNonce,
            phaseHash
        ));

        usedNonces[expectedNonce] = true;
        nonce = expectedNonce + 1;
        if (config.adapter == ADAPTER_MINT_TO) {
            IMintTo(target).mintTo{value: value}(recipient, quantity);
        } else {
            IPublicMintTo(target).publicMint{value: value}(recipient, quantity);
        }
        emit MintExecuted(intentHash, target, recipient, config.adapter, quantity, value, expectedNonce);
    }

    function withdrawETH(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Withdraw failed");
        emit ETHWithdrawn(recipient, amount);
    }

    receive() external payable {}
}
