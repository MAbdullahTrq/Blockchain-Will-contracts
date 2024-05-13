require("dotenv").config("../.env");
const { ethers } = require("hardhat");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const [admin, authorizer, owner, _] = await ethers.getSigners();
  try {
    const [admin, authorizer, owner, wallet1, wallet2, wallet3, _] =
      await ethers.getSigners();

    const WillAssetManagerFactory = await ethers.getContractFactory(
      "contracts/main/WillAssetManager.sol:WillAssetManager",
      admin
    );
    const WillVaultFactoryArtifact = await ethers.getContractFactory(
      "contracts/main/WillVaultFactory.sol:WillVaultFactory",
      admin
    );

    const WillAssetManager = await (
      await WillAssetManagerFactory.deploy(3)
    ).deployed();

    await sleep(5000);
    console.log("WillAssetManager: " + WillAssetManager.address);

    const WillVaultFactory = await WillVaultFactoryArtifact.deploy(
      WillAssetManager.address,
      5
    );
    await WillVaultFactory.deployed();

    await sleep(5000);
    console.log("WillVaultFactory: " + WillVaultFactory.address);

    await WillAssetManager.grantRole(
      WillAssetManager.ASSET_AUTHORIZER(),
      authorizer.address
    );
    await sleep(5000);

    await WillAssetManager.setVaultFactory(WillVaultFactory.address);
    await sleep(5000);

    await WillVaultFactory.grantRole(
      await WillVaultFactory.ADMIN_ROLE(),
      WillAssetManager.address
    );
    await sleep(5000);

    await WillVaultFactory.grantRole(
      await WillVaultFactory.ADMIN_ROLE(),
      admin.address
    );
    await sleep(5000);

    await sleep(5000);
  } catch (error) {
    console.log(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
