// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IStandardPublicMint {
    function publicMint(uint256 quantity) external payable;
}

contract AutoMintVault {
    address public owner;
    address public botAddress;
    address public approvedTarget;
    uint256 public maxQuantity;
    uint256 public maxValuePerMint;
    uint256 public nonce;
    uint256 public constant ROBINHOOD_CHAIN_ID = 4663;

    event BotApproved(address indexed botAddress);
    event BotRevoked(address indexed previousBot);
    event TargetConfigured(address indexed target, uint256 maxQuantity, uint256 maxValuePerMint);
    event AutoMintExecuted(address indexed target, uint256 quantity, uint256 value, uint256 nonce);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event Received(address indexed sender, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == botAddress || msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRobinhood() {
        require(block.chainid == ROBINHOOD_CHAIN_ID, "Wrong network");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function approveBot(address _botAddress) external onlyOwner {
        require(_botAddress != address(0), "Invalid bot address");
        botAddress = _botAddress;
        emit BotApproved(_botAddress);
    }

    function revokeBot() external onlyOwner {
        address previousBot = botAddress;
        botAddress = address(0);
        emit BotRevoked(previousBot);
    }

    function configureTarget(address target, uint256 quantityLimit, uint256 valueLimit) external onlyOwner {
        require(target != address(0), "Invalid target");
        require(quantityLimit > 0, "Invalid quantity limit");
        require(valueLimit > 0, "Invalid value limit");
        approvedTarget = target;
        maxQuantity = quantityLimit;
        maxValuePerMint = valueLimit;
        emit TargetConfigured(target, quantityLimit, valueLimit);
    }

    function executeAutoMint(
        uint256 quantity,
        uint256 value,
        uint256 deadline,
        uint256 expectedNonce
    ) external onlyAuthorized onlyRobinhood {
        uint256 startGas = gasleft();
        require(block.timestamp <= deadline, "Expired");
        require(expectedNonce == nonce, "Invalid nonce");
        require(approvedTarget != address(0), "Target not configured");
        require(quantity > 0 && quantity <= maxQuantity, "Quantity exceeds limit");
        require(value > 0 && value <= maxValuePerMint, "Value exceeds limit");
        require(value <= address(this).balance, "Insufficient vault balance");

        nonce = expectedNonce + 1;
        IStandardPublicMint(approvedTarget).publicMint{value: value}(quantity);
        emit AutoMintExecuted(approvedTarget, quantity, value, expectedNonce);

        // Gas fee is deducted 100% from this vault balance (no sponsored gas)
        if (msg.sender == botAddress) {
            uint256 gasUsed = startGas - gasleft() + 21000;
            uint256 gasRefund = gasUsed * tx.gasprice;
            if (gasRefund > 0 && address(this).balance >= gasRefund) {
                payable(msg.sender).transfer(gasRefund);
            }
        }
    }

    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient vault balance");
        to.transfer(amount);
        emit ETHWithdrawn(to, amount);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
