// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const MarketplaceModule = buildModule('MarketplaceModule', (m) => {

    const marketplace = m.contract('NFTMarketplace');

    return { marketplace };
});

export default MarketplaceModule;
