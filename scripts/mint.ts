import { ethers } from "hardhat";
import { NFTMarketplace } from "../typechain-types/contracts/NftMarketplace.sol/NFTMarketplace";
import { ContractTransactionReceipt, Log } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting NFT with account:", deployer.address);

  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplaceAddress = "0xB5287C4875d14E610Bf94FEf9cD241835b00589B";
  const marketplace = NFTMarketplace.attach(marketplaceAddress) as unknown as NFTMarketplace;

  const listingPrice = await marketplace.getListingPrice();
  console.log("Listing Price:", ethers.formatEther(listingPrice));

  const tokenURI = "https://picsum.photos/200/300"; 
  const price = ethers.parseEther("0.00025"); 

  console.log("Creating token with URI:", tokenURI);
  console.log("Price:", ethers.formatEther(price), "ETH");

  const createTokenTx = await marketplace.createToken(tokenURI, price, {
    value: price, 
  });

  const receipt = await createTokenTx.wait();
  
  if (receipt) {
    const marketItemCreatedEvent = (receipt as ContractTransactionReceipt).logs.find(
      (log: Log) => {
        const event = marketplace.interface.parseLog(log);
        return event?.name === "MarketItemCreated";
      }
    );

    if (marketItemCreatedEvent) {
      const event = marketplace.interface.parseLog(marketItemCreatedEvent);
      const tokenId = event?.args[0]; 
      console.log("Token created successfully!");
      console.log("Token ID:", tokenId.toString());
      console.log("Token URI:", tokenURI);
      console.log("Listed price:", ethers.formatEther(price), "ETH");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
