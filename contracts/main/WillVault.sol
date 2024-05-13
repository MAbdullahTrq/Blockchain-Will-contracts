// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IWillVault.sol";

contract WillVault is IWillVault, AccessControl, Pausable {
    using SafeERC20 for IERC20;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address _memberAddress, address _WillAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, _memberAddress);
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, _memberAddress);
        _setupRole(ADMIN_ROLE, _WillAddress);
    }

    function transferErc20TokensAllowed(
        address _contractAddress,
        address _ownerAddress,
        address _recipientAddress,
        uint256 _amount
    ) external override whenNotPaused onlyRole(ADMIN_ROLE) {
        IERC20(_contractAddress).transferFrom(
            _ownerAddress,
            _recipientAddress,
            _amount
        );
    }

    function transferErc721TokensAllowed(
        address _contractAddress,
        address _ownerAddress,
        address _recipientAddress,
        uint256 _tokenId
    ) external override whenNotPaused onlyRole(ADMIN_ROLE) {
        IERC721(_contractAddress).safeTransferFrom(
            _ownerAddress,
            _recipientAddress,
            _tokenId
        );
    }

    function transferErc1155TokensAllowed(
        address _contractAddress,
        address _ownerAddress,
        address _recipientAddress,
        uint256 _tokenId,
        uint256 _amount
    ) external override whenNotPaused onlyRole(ADMIN_ROLE) {
        IERC1155(_contractAddress).safeTransferFrom(
            _ownerAddress,
            _recipientAddress,
            _tokenId,
            _amount,
            "0x01"
        );
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
