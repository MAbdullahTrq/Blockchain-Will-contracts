const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deploy() {
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
    await WillAssetManagerFactory.deploy(1)
  ).deployed();
  const WillVaultFactory = await WillVaultFactoryArtifact.deploy(
    WillAssetManager.address,
    5
  );
  await WillVaultFactory.deployed();

  await WillAssetManager.grantRole(
    WillAssetManager.ASSET_AUTHORIZER(),
    authorizer.address
  );
  await WillAssetManager.setVaultFactory(WillVaultFactory.address);
  await WillVaultFactory.grantRole(
    await WillVaultFactory.ADMIN_ROLE(),
    WillAssetManager.address
  );
  await WillVaultFactory.grantRole(
    await WillVaultFactory.ADMIN_ROLE(),
    admin.address
  );
  await WillVaultFactory.setWillAssetManagerAddress(
    WillAssetManager.address
  );

  const ownerAssetManager = WillAssetManagerFactory.connect(owner).attach(
    WillAssetManager.address
  );
  const ownerVaultFactory = WillVaultFactoryArtifact.connect(owner).attach(
    WillVaultFactory.address
  );
  const wallet1VaultFactory = WillVaultFactoryArtifact.connect(
    wallet1
  ).attach(WillVaultFactory.address);
  const wallet2VaultFactory = WillVaultFactoryArtifact.connect(
    wallet2
  ).attach(WillVaultFactory.address);
  const wallet3VaultFactory = WillVaultFactoryArtifact.connect(
    wallet3
  ).attach(WillVaultFactory.address);

  return {
    admin,
    authorizer,
    owner,
    WillAssetManager,
    WillVaultFactory,
    ownerAssetManager,
    ownerVaultFactory,
    wallet1,
    wallet2,
    wallet3,
    wallet1VaultFactory,
    wallet2VaultFactory,
    wallet3VaultFactory,
  };
}

describe("WillAssetManager - vault", async function () {
  context("Create & Get User Vault", async function () {
    it("Should create a User vault with valid params", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        WillVaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await expect(ownerAssetManager.createUserVault(userId, nonce, signature))
        .to.emit(WillVaultFactory, "UserVaultCreated")
        .withArgs(
          userId,
          owner.address,
          await WillVaultFactory.getVault(owner.address)
        );
    });
    it("Should add multiple wallets to same vault", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);
      await wallet3VaultFactory.addWallet(userId, owner.address);
      expect(await WillVaultFactory.getVault(wallet1.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
      expect(await WillVaultFactory.getVault(wallet2.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
      expect(await WillVaultFactory.getVault(wallet3.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
    });
    it("Should retrieve same vault from different listed addresses", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);
      await wallet3VaultFactory.addWallet(userId, owner.address);
      expect(await WillVaultFactory.getVault(wallet1.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
      expect(await WillVaultFactory.getVault(wallet2.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
      expect(await WillVaultFactory.getVault(wallet3.address)).to.be.equals(
        await WillVaultFactory.getVault(owner.address)
      );
    });
    it("Should fail to retrieve user vault from non listed address", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);

      await expect(
        WillVaultFactory.getVault(wallet3.address)
      ).to.be.revertedWith("WillVaultFactory: User vault not deployed");
    });
  });

  context("Remove Wallets from Listed Wallets", async function () {
    it("Should remove multiple listed wallets when called by the main wallet", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerVaultFactory,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);
      await wallet3VaultFactory.addWallet(userId, owner.address);

      await expect(
        ownerVaultFactory.removeWallet(userId, wallet1.address)
      ).to.emit(WillVaultFactory, "WalletRemoved");
    });
    it("Should failt to remove listed wallet when called by the other wallet", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerVaultFactory,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);
      await wallet3VaultFactory.addWallet(userId, owner.address);

      await expect(
        wallet3VaultFactory.removeWallet(userId, wallet1.address)
      ).to.be.revertedWith("WillVaultFactory: User vault not deployed");
    });
    it("Should failt to remove unlisted wallet", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerVaultFactory,
        WillVaultFactory,
        wallet1,
        wallet2,
        wallet3,
        wallet1VaultFactory,
        wallet2VaultFactory,
        wallet3VaultFactory,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(16)
      ).toString();
      const hashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [owner.address, nonce]
        )
      );
      const signature = await authorizer.signMessage(hashedMessage);
      await ownerAssetManager.createUserVault(userId, nonce, signature);

      await wallet1VaultFactory.addWallet(userId, owner.address);
      await wallet2VaultFactory.addWallet(userId, owner.address);

      await expect(
        ownerVaultFactory.removeWallet(userId, wallet3.address)
      ).to.be.revertedWith("WillVaultFactory: Invalid address provided");
    });
  });
});
