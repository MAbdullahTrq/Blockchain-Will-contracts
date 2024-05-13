// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/IWillVaultFactory.sol";
import "./WillVault.sol";

contract WillVaultFactory is IWillVaultFactory, AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(address => WillVault) private memberToContract;
    mapping(address => address) public addressToMainWallet;
    mapping(address => uint16) public addressCount;
    address public WillAssetManager;
    uint256 public maxWallets;

    event UserVaultCreated(string userId, address owner, address vault);

    event WalletAdded(
        string userId,
        address mainWallet,
        address newWallet,
        address vault
    );

    event WalletRemoved(
        string userId,
        address mainWallet,
        address removedWallet,
        address vault
    );

    constructor(address _WillAssetManager, uint256 _maxWallets) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _WillAssetManager);
        WillAssetManager = _WillAssetManager;
        maxWallets = _maxWallets;
    }

    modifier validAddress(address _address) {
        require(
            _address != address(0),
            "WillVaultFactory: Not valid address"
        );
        _;
    }

    function createVault(
        string calldata userId,
        address _memberAddress
    ) external override onlyRole(ADMIN_ROLE) whenNotPaused {
        require(
            WillAssetManager != address(0),
            "WillVaultFactory: WillBusiness not set"
        );
        require(
            address(memberToContract[_memberAddress]) == address(0),
            "WillVaultFactory: User vault already deployed"
        );
        WillVault WillVault = new WillVault(
            _memberAddress,
            address(WillAssetManager)
        );
        memberToContract[_memberAddress] = WillVault;
        emit UserVaultCreated(userId, _memberAddress, address(WillVault));
    }

    function getVault(
        address _listedAddress
    ) public view override returns (address) {
        address _memberAddress = getMainWallet(_listedAddress);
        require(
            _memberAddress != address(0),
            "WillVaultFactory: User vault not deployed"
        );
        return address(memberToContract[_memberAddress]);
    }

    function getMainWallet(
        address _listedAddress
    ) public view returns (address) {
        if (address(memberToContract[_listedAddress]) != address(0)) {
            return _listedAddress;
        }
        return addressToMainWallet[_listedAddress];
    }

    function addWallet(
        string calldata userId,
        address _memberAddress
    ) external {
        require(
            address(memberToContract[_memberAddress]) != address(0),
            "WillVaultFactory: User vault not deployed"
        );
        require(
            addressCount[_memberAddress] + 1 <= maxWallets,
            "WillVaultFactory: Max wallet limit exceeded"
        );
        addressToMainWallet[_msgSender()] = _memberAddress;
        addressCount[_memberAddress]++;
        emit WalletAdded(
            userId,
            _memberAddress,
            _msgSender(),
            address(memberToContract[_memberAddress])
        );
    }

    function removeWallet(
        string calldata userId,
        address _listedAddress
    ) external {
        require(
            address(memberToContract[_msgSender()]) != address(0),
            "WillVaultFactory: User vault not deployed"
        );
        require(
            addressToMainWallet[_listedAddress] == _msgSender(),
            "WillVaultFactory: Invalid address provided"
        );
        delete addressToMainWallet[_listedAddress];
        addressCount[_msgSender()]--;
        emit WalletRemoved(
            userId,
            _msgSender(),
            _listedAddress,
            address(memberToContract[_msgSender()])
        );
    }

    function setWillAssetManagerAddress(
        address _assetManager
    )
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        validAddress(_assetManager)
    {
        WillAssetManager = _assetManager;
    }

    function pauseContract()
        external
        override
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _pause();
    }

    function unpauseContract()
        external
        override
        whenPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _unpause();
    }
}
