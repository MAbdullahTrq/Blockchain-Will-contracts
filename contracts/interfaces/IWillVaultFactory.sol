// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

interface IWillVaultFactory {
    function createVault(string memory userId, address _memberAddress) external;

    function getVault(address _listedAddress) external view returns (address);

    function getMainWallet(address _listedAddress)
        external
        view
        returns (address);

    function addWallet(string memory userId, address _memberAddress) external;

    function removeWallet(string memory userId, address _memberAddress)
        external;

    function setwillAssetManagerAddress(address _VaultAddress) external;

    function pauseContract() external;

    function unpauseContract() external;
}
