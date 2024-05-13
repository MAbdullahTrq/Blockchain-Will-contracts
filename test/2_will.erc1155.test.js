const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deploy() {
  const [
    admin,
    authorizer,
    owner,
    beneficiary,
    beneficiary1,
    beneficiary2,
    beneficiary3,
    beneficiary4,
    beneficiary5,
    wallet1,
    wallet2,
    wallet3,
    _,
  ] = await ethers.getSigners();

  const ERC1155 = await (
    await ethers.getContractFactory("ERC1155Mock", admin)
  ).deploy();

  const WillAssetManagerFactory = await ethers.getContractFactory(
    "contracts/main/WillAssetManager.sol:WillAssetManager",
    admin
  );
  const WillVaultFactoryArtifact = await ethers.getContractFactory(
    "contracts/main/WillVaultFactory.sol:WillVaultFactory",
    admin
  );
  const WillVaultArtifact = await ethers.getContractFactory(
    "contracts/main/WillVault.sol:WillVault",
    admin
  );

  const WillAssetManager = await (
    await WillAssetManagerFactory.deploy(1)
  ).deployed();
  const WillVaultFactory = await (
    await WillVaultFactoryArtifact.deploy(WillAssetManager.address, 5)
  ).deployed();
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

  const beneficiaryAssetManager = WillAssetManagerFactory.connect(
    beneficiary
  ).attach(WillAssetManager.address);
  const wallets = [wallet1.address, wallet2.address, wallet3.address];
  const userId = ethers.utils.hashMessage(owner.address);
  const nonce = ethers.BigNumber.from(ethers.utils.randomBytes(16)).toString();
  const hashedMessage = ethers.utils.arrayify(
    ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [owner.address, nonce]
    )
  );
  const signature = await authorizer.signMessage(hashedMessage);
  await ownerAssetManager.createUserVault(userId, nonce, signature);
  const ownerVaultAddress = await WillVaultFactory.getVault(owner.address);

  const ownerERC1155 = await (
    await ethers.getContractFactory("ERC1155Mock", admin)
  )
    .connect(owner)
    .attach(ERC1155.address);
  const beneficiaryERC1155 = await (
    await ethers.getContractFactory("ERC1155Mock", admin)
  )
    .connect(beneficiary)
    .attach(ERC1155.address);

  await ownerERC1155.mintBatch(
    owner.address,
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "0x01"
  );
  await ownerERC1155.setApprovalForAll(ownerVaultAddress, true);

  return {
    admin,
    authorizer,
    owner,
    WillAssetManager,
    WillVaultFactory,
    ownerAssetManager,
    ownerVaultAddress,
    beneficiaryAssetManager,
    ERC1155,
    ownerERC1155,
    beneficiaryERC1155,
    beneficiary,
    beneficiary1,
    beneficiary2,
    beneficiary3,
    beneficiary4,
    beneficiary5,
  };
}

describe("WillAssetManager - ERC1155 Assets", async function () {
  context("Add ERC1155 Assets", async function () {
    it("Should add single ERC1155 asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await expect(
        ownerAssetManager.addERC1155Assets(
          userId,
          [ERC1155.address],
          [1],
          [1],
          [[beneficiary.address]],
          [[100]]
        )
      )
        .to.emit(ownerAssetManager, "ERC1155AssetAdded")
        .withArgs(
          userId,
          owner.address,
          ERC1155.address,
          1,
          1,
          [beneficiary.address],
          [100]
        );
    });
    it("Should fail to add single ERC1155 asset twice", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      await expect(
        ownerAssetManager.addERC1155Assets(
          userId,
          [ERC1155.address],
          [1],
          [1],
          [[beneficiary.address]],
          [[100]]
        )
      ).to.be.revertedWith("WillAssetManager: Asset is already listed");
    });
    it("Should fail to add single ERC1155 asset when balance is insufficient", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,

        ERC1155,
        beneficiary,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await expect(
        ownerAssetManager.addERC1155Assets(
          userId,
          [ERC1155.address],
          [1],
          [2],
          [[beneficiary.address]],
          [[100]]
        )
      ).to.be.revertedWith("WillAssetManager: Insufficient token balance");
    });
    it("Should fail to add single ERC1155 asset when asset not approved", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerVaultAddress,
        ownerERC1155,

        ERC1155,
        beneficiary,
      } = await deploy();
      await ownerERC1155.setApprovalForAll(ownerVaultAddress, false);
      const userId = ethers.utils.hashMessage(owner.address);
      await expect(
        ownerAssetManager.addERC1155Assets(
          userId,
          [ERC1155.address],
          [1],
          [1],
          [[beneficiary.address]],
          [[100]]
        )
      ).to.be.revertedWith("WillAssetManager: Asset not approved");
    });
  });

  context("Claim ERC1155 Asset", async function () {
    it("Should claim single ERC1155 Asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);

      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          1,
          nonce + 1,
          [claimSignature]
        )
      )
        .to.emit(beneficiaryAssetManager, "ERC1155AssetClaimed") // transfer from minter to redeemer
        .withArgs(
          userId,
          owner.address,
          beneficiary.address,
          ERC1155.address,
          1,
          1,
          [admin.address]
        );
    });
    it("Should reclaim single ERC1155 Asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerERC1155,
        beneficiaryERC1155,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [5],
        [5],
        [[beneficiary.address]],
        [[100]]
      );
      await ownerERC1155.safeTransferFrom(
        owner.address,
        beneficiary.address,
        5,
        1,
        "0x01"
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 5, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          5,
          nonce + 1,
          [claimSignature]
        )
      )
        .to.emit(beneficiaryAssetManager, "ERC1155AssetClaimed")
        .withArgs(
          userId,
          owner.address,
          beneficiary.address,
          ERC1155.address,
          5,
          4,
          [admin.address]
        );
      await beneficiaryERC1155.safeTransferFrom(
        beneficiary.address,
        owner.address,
        5,
        1,
        "0x01"
      );

      const claimHashedMessage1 = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 5, nonce + 2]
        )
      );
      const claimSignature1 = await admin.signMessage(claimHashedMessage1);
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          5,
          nonce + 2,
          [claimSignature1]
        )
      )
        .to.emit(beneficiaryAssetManager, "ERC1155AssetClaimed")
        .withArgs(
          userId,
          owner.address,
          beneficiary.address,
          ERC1155.address,
          5,
          1,
          [admin.address]
        );
    });
    it("Should fail to claim single ERC1155 Asset with invalid signature", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature = await owner.signMessage(claimHashedMessage);
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          1,
          nonce + 1,
          [claimSignature]
        )
      ).to.be.revertedWith("WillAssetManager: Unauthorized signature");
    });
    it("Should fail to claim single ERC1155 Asset with invalid asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 2, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          2,
          nonce + 1,
          [claimSignature]
        )
      ).to.be.revertedWith("WillAssetManager: Asset not found");
    });
    it("Should fail to claim single ERC1155 Asset when beneficiary has already claimed the asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [2],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 2, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);
      await beneficiaryAssetManager.claimERC1155Asset(
        userId,
        owner.address,
        ERC1155.address,
        2,
        nonce + 1,
        [claimSignature]
      );
      const claimHashedMessage1 = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 2, nonce + 2]
        )
      );
      const claimSignature1 = await admin.signMessage(claimHashedMessage1);
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          2,
          nonce + 2,
          [claimSignature1]
        )
      ).to.be.revertedWith(
        "WillAssetManager: Beneficiary has already claimed the asset"
      );
    });
    it("Should fail to claim single ERC1155 Asset when owner has zero balance for the asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerERC1155,
        ERC1155,
        beneficiary,
        beneficiary1,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);
      await ownerERC1155.safeTransferFrom(
        owner.address,
        beneficiary1.address,
        1,
        1,
        "0x01"
      );
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          1,
          nonce + 1,
          [claimSignature]
        )
      ).to.be.revertedWith(
        "WillAssetManager: Owner has zero balance for this asset"
      );
    });
    it("Should fail to claim single ERC1155 Asset with duplicate signature", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ownerERC1155,
        ERC1155,
        beneficiary,
        beneficiary1,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature1 = await admin.signMessage(claimHashedMessage);
      const claimSignature2 = await admin.signMessage(claimHashedMessage);
      await ownerERC1155.safeTransferFrom(
        owner.address,
        beneficiary1.address,
        1,
        1,
        "0x01"
      );
      await expect(
        beneficiaryAssetManager.claimERC1155Asset(
          userId,
          owner.address,
          ERC1155.address,
          1,
          nonce + 1,
          [claimSignature1, claimSignature2]
        )
      ).to.be.revertedWith(
        "WillAssetManager: Duplicate signature not allowed"
      );
    });
  });

  context("Remove ERC1155 Asset", async function () {
    it("Should remove single ERC1155 Asset with valid params", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      await expect(
        ownerAssetManager.removeERC1155Asset(userId, ERC1155.address, 1)
      )
        .to.emit(ownerAssetManager, "ERC1155AssetRemoved")
        .withArgs(userId, owner.address, ERC1155.address, 1);
    });
    it("Should fail to remove single ERC1155 Asset when the beneficiaries have already claimed the asset", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );

      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);

      await beneficiaryAssetManager.claimERC1155Asset(
        userId,
        owner.address,
        ERC1155.address,
        1,
        nonce + 1,
        [claimSignature]
      );

      await expect(
        ownerAssetManager.removeERC1155Asset(userId, ERC1155.address, 1)
      ).to.be.revertedWith(
        "WillAssetManager: Asset has been transferred to the beneficiaries"
      );
    });
    it("Should fail to remove single ERC1155 Asset when the asset is not listed", async function () {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();

      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );

      await expect(
        ownerAssetManager.removeERC1155Asset(userId, ERC1155.address, 2)
      ).to.be.revertedWith("WillAssetManager: Asset not found");
    });
  });

  context("Change ERC1155 Asset Beneficiary", async () => {
    it("Should change the Percentage of beneficiary for ERC1155 Asset", async () => {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiary1,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      await expect(
        ownerAssetManager.setERC1155BeneficiaryPercentage(
          userId,
          ERC1155.address,
          1,
          beneficiary.address,
          90
        )
      )
        .to.emit(ownerAssetManager, "BeneficiaryPercentageChanged")
        .withArgs(
          userId,
          owner.address,
          ERC1155.address,
          1,
          beneficiary.address,
          90
        );
    });
    it("Should fail to change the Percentage of beneficiary for ERC1155 Asset when percentage exceeds 100", async () => {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiary1,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      await expect(
        ownerAssetManager.setERC1155BeneficiaryPercentage(
          userId,
          ERC1155.address,
          1,
          beneficiary.address,
          101
        )
      ).to.be.revertedWith(
        "WillAssetManager: Beneficiary percentage exceeds total of 100"
      );
    });
    it("Should fail to change the Percentage of beneficiary for ERC1155 Asset when asset is not listed", async () => {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiary1,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );
      await expect(
        ownerAssetManager.setERC1155BeneficiaryPercentage(
          userId,
          ERC1155.address,
          2,
          beneficiary.address,
          90
        )
      ).to.be.revertedWith("WillAssetManager: Asset not found");
    });
    it("Should fail to change the Percentage of beneficiary for ERC1155 Asset when asset is not listed", async () => {
      const {
        admin,
        authorizer,
        owner,
        ownerAssetManager,
        ERC1155,
        beneficiary,
        beneficiaryAssetManager,
      } = await deploy();
      const userId = ethers.utils.hashMessage(owner.address);
      const nonce = ethers.BigNumber.from(
        ethers.utils.randomBytes(4)
      ).toString();
      await ownerAssetManager.addERC1155Assets(
        userId,
        [ERC1155.address],
        [1],
        [1],
        [[beneficiary.address]],
        [[100]]
      );

      const claimHashedMessage = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "address", "uint256", "uint256"],
          [owner.address, beneficiary.address, ERC1155.address, 1, nonce + 1]
        )
      );
      const claimSignature = await admin.signMessage(claimHashedMessage);

      await beneficiaryAssetManager.claimERC1155Asset(
        userId,
        owner.address,
        ERC1155.address,
        1,
        nonce + 1,
        [claimSignature]
      );

      await expect(
        ownerAssetManager.setERC1155BeneficiaryPercentage(
          userId,
          ERC1155.address,
          1,
          beneficiary.address,
          90
        )
      ).to.be.revertedWith(
        "WillAssetManager: Beneficiary has already claimed the asset"
      );
    });
  });
});
