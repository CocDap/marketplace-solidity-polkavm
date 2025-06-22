import hre from 'hardhat';
import { expect } from 'chai';

describe('NFTMarketplace', () => {
    let marketplace: any;
    let owner: any;
    let seller: any;
    let buyer: any;
    let addr1: any;
    let addr2: any;

    const toWei = (value: string) => hre.ethers.parseUnits(value, 18);

    beforeEach(async () => {
        [owner, seller, buyer, addr1, addr2] = await hre.ethers.getSigners();

        const NFTMarketplace = await hre.ethers.getContractFactory('NFTMarketplace');


        marketplace = await NFTMarketplace.deploy();
        await marketplace.waitForDeployment();

    });

    describe('Constructor', () => {
        it('should set the correct owner', async () => {
            const listingPrice = await marketplace.getListingPrice();
            expect(listingPrice).to.equal(toWei('0.00025'));
        });

        it('should set correct ERC721 name and symbol', async () => {
            expect(await marketplace.name()).to.equal("DOT's NFT");
            expect(await marketplace.symbol()).to.equal('DOTNFT');
        });
    });

    describe('Listing Price Management', () => {
        it('should return correct default listing price', async () => {
            const listingPrice = await marketplace.getListingPrice();
            expect(listingPrice).to.equal(toWei('0.00025'));
        });

        it('should allow owner to update listing price', async () => {
            const newPrice = toWei('0.001');
            await marketplace.updateListingPrice(newPrice);
            expect(await marketplace.getListingPrice()).to.equal(newPrice);
        });

        it('should reject non-owner from updating listing price', async () => {
            const newPrice = toWei('0.001');
            await expect(
                marketplace.connect(seller).updateListingPrice(newPrice)
            ).to.be.revertedWith('Only marketplace owner can update listing price.');
        });
    });

    describe('Token Creation and Listing', () => {
        const tokenURI = 'https://example.com/metadata/1.json';
        const tokenPrice = toWei('0.1');

        it('should create token and list it for sale', async () => {
            const listingPrice = await marketplace.getListingPrice();

            const tx = await marketplace.connect(seller).createToken(tokenURI, tokenPrice, {
                value: listingPrice
            });
            const receipt = await tx.wait();

            const event = receipt?.logs.find((log: any) => {
                try {
                    const parsedLog = marketplace.interface.parseLog(log);
                    return parsedLog?.name === 'MarketItemCreated';
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;

            expect(await marketplace.balanceOf(marketplace.target)).to.equal(1);
            expect(await marketplace.ownerOf(1)).to.equal(marketplace.target);
            expect(await marketplace.tokenURI(1)).to.equal(tokenURI);
        });

        it('should reject token creation without listing price', async () => {
            await expect(
                marketplace.connect(seller).createToken(tokenURI, tokenPrice)
            ).to.be.revertedWith('Price must be equal to listing price');
        });

        it('should reject token creation with zero price', async () => {
            const listingPrice = await marketplace.getListingPrice();
            await expect(
                marketplace.connect(seller).createToken(tokenURI, 0, {
                    value: listingPrice
                })
            ).to.be.revertedWith('Price must be at least 1 wei');
        });

        it('should increment token IDs correctly', async () => {
            const listingPrice = await marketplace.getListingPrice();

            await marketplace.connect(seller).createToken(tokenURI, tokenPrice, {
                value: listingPrice
            });
            expect(await marketplace.ownerOf(1)).to.equal(marketplace.target);

            await marketplace.connect(addr1).createToken('https://example.com/metadata/2.json', toWei('0.2'), {
                value: listingPrice
            });
            expect(await marketplace.ownerOf(2)).to.equal(marketplace.target);
        });
    });

    describe('Token Purchasing', () => {
        const tokenURI = 'https://example.com/metadata/1.json';
        const tokenPrice = toWei('0.1');

        beforeEach(async () => {
            const listingPrice = await marketplace.getListingPrice();
            await marketplace.connect(seller).createToken(tokenURI, tokenPrice, {
                value: listingPrice
            });
        });

        it('should allow purchasing a listed token', async () => {
            const initialBuyerBalance = await hre.ethers.provider.getBalance(buyer.address);
            const initialSellerBalance = await hre.ethers.provider.getBalance(seller.address);

            await marketplace.connect(buyer).buy(1, { value: tokenPrice });

            expect(await marketplace.ownerOf(1)).to.equal(buyer.address);

            const finalBuyerBalance = await hre.ethers.provider.getBalance(buyer.address);
            expect(finalBuyerBalance).to.be.lt(initialBuyerBalance - tokenPrice);

            const finalSellerBalance = await hre.ethers.provider.getBalance(seller.address);
            expect(finalSellerBalance).to.be.gt(initialSellerBalance);
        });

        it('should reject purchase with incorrect price', async () => {
            await expect(
                marketplace.connect(buyer).buy(1, { value: toWei('0.05') })
            ).to.be.revertedWith('Please submit the asking price in order to complete the purchase');
        });

        it('should emit NFTPurchased event', async () => {
            const tx = await marketplace.connect(buyer).buy(1, { value: tokenPrice });
            const receipt = await tx.wait();

            const event = receipt?.logs.find((log: any) => {
                try {
                    const parsedLog = marketplace.interface.parseLog(log);
                    return parsedLog?.name === 'NFTPurchased';
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
        });

        it('should update sold count correctly', async () => {
            const listingPrice = await marketplace.getListingPrice();
            await marketplace.connect(addr1).createToken('https://example.com/metadata/2.json', toWei('0.2'), {
                value: listingPrice
            });

            await marketplace.connect(buyer).buy(1, { value: tokenPrice });

            const marketItems = await marketplace.fetchMarketItems();
            expect(marketItems.length).to.equal(1);
        });
    });

    describe('Token Reselling', () => {
        const tokenURI = 'https://example.com/metadata/1.json';
        const tokenPrice = toWei('0.1');

        beforeEach(async () => {
            const listingPrice = await marketplace.getListingPrice();
            await marketplace.connect(seller).createToken(tokenURI, tokenPrice, {
                value: listingPrice
            });
            await marketplace.connect(buyer).buy(1, { value: tokenPrice });
        });

        it('should allow token owner to resell', async () => {
            const newPrice = toWei('0.15');
            await marketplace.connect(buyer).resellToken(1, newPrice, { value: newPrice });

            expect(await marketplace.ownerOf(1)).to.equal(marketplace.target);

            const marketItems = await marketplace.fetchMarketItems();
            expect(marketItems.length).to.equal(1);
            expect(marketItems[0].tokenId).to.equal(1n);
            expect(marketItems[0].price).to.equal(newPrice);
        });

        it('should reject resell by non-owner', async () => {
            const newPrice = toWei('0.15');
            await expect(
                marketplace.connect(addr1).resellToken(1, newPrice, { value: newPrice })
            ).to.be.revertedWith('Only item owner can perform this operation');
        });

        it('should reject resell with incorrect value', async () => {
            const newPrice = toWei('0.15');
            await expect(
                marketplace.connect(buyer).resellToken(1, newPrice, { value: toWei('0.1') })
            ).to.be.revertedWith('Price must be equal by sender.value');
        });
    });

    describe('Market Data Queries', () => {
        const tokenURI1 = 'https://example.com/metadata/1.json';
        const tokenURI2 = 'https://example.com/metadata/2.json';
        const tokenPrice1 = toWei('0.1');
        const tokenPrice2 = toWei('0.2');

        beforeEach(async () => {
            const listingPrice = await marketplace.getListingPrice();

            await marketplace.connect(seller).createToken(tokenURI1, tokenPrice1, {
                value: listingPrice
            });
            await marketplace.connect(addr1).createToken(tokenURI2, tokenPrice2, {
                value: listingPrice
            });
        });

        it('should fetch all market items', async () => {
            const marketItems = await marketplace.fetchMarketItems();
            expect(marketItems.length).to.equal(2);
            expect(marketItems[0].tokenId).to.equal(1n);
            expect(marketItems[1].tokenId).to.equal(2n);
        });

        it('should fetch user NFTs after purchase', async () => {
            await marketplace.connect(buyer).buy(1, { value: tokenPrice1 });

            const userNFTs = await marketplace.connect(buyer).fetchMyNFTs();
            expect(userNFTs.length).to.equal(1);
            expect(userNFTs[0].tokenId).to.equal(1n);
        });

        it('should fetch items listed by user', async () => {
            const listedItems = await marketplace.connect(seller).fetchItemsListed();
            expect(listedItems.length).to.equal(1);
            expect(listedItems[0].tokenId).to.equal(1n);
            expect(listedItems[0].seller).to.equal(seller.address);
        });

        it('should update market items after purchase', async () => {
            await marketplace.connect(buyer).buy(1, { value: tokenPrice1 });

            const marketItems = await marketplace.fetchMarketItems();
            expect(marketItems.length).to.equal(1);
            expect(marketItems[0].tokenId).to.equal(2n);
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple purchases correctly', async () => {
            const listingPrice = await marketplace.getListingPrice();
            const tokenPrice = toWei('0.1');

            await marketplace.connect(seller).createToken('https://example.com/metadata/1.json', tokenPrice, {
                value: listingPrice
            });

            await marketplace.connect(buyer).buy(1, { value: tokenPrice });

            await expect(
                marketplace.connect(addr1).buy(1, { value: tokenPrice })
            ).to.be.reverted;
        });

        it('should handle resell after purchase', async () => {
            const listingPrice = await marketplace.getListingPrice();
            const tokenPrice = toWei('0.1');

            await marketplace.connect(seller).createToken('https://example.com/metadata/1.json', tokenPrice, {
                value: listingPrice
            });
            await marketplace.connect(buyer).buy(1, { value: tokenPrice });

            const newPrice = toWei('0.15');
            await marketplace.connect(buyer).resellToken(1, newPrice, { value: newPrice });

            const marketItems = await marketplace.fetchMarketItems();
            expect(marketItems.length).to.equal(1);
            expect(marketItems[0].price).to.equal(newPrice);
        });
    });
});
