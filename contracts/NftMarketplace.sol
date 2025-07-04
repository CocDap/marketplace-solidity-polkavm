// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract NFTMarketplace is ERC721URIStorage {

    uint256 private _tokenIds;
    uint256 private _itemsSold;

    uint256 listingPrice = 0.00025 ether;

    address payable owner; 

    mapping(uint256 => MarketItem) private idToMarketItem;

    struct MarketItem {
      uint256 tokenId;
      address payable seller;
      address payable owner;
      uint256 price;
      bool sold;
    }


    event MarketItemCreated (
      uint256 indexed tokenId,
      address seller,
      address owner,
      uint256 price,
      bool sold
    );

    event NFTPurchased (
      uint256 indexed tokenId,
      address indexed buyer,
      address indexed seller,
      uint256 price
    );



    constructor() ERC721("DOT's NFT", "DOTNFT") {
      owner = payable(msg.sender);
    }

    function updateListingPrice(uint _listingPrice) public payable {
      require(owner == msg.sender, "Only marketplace owner can update listing price.");
      listingPrice = _listingPrice;
    }

    function getListingPrice() public view returns (uint256) {
      return listingPrice;
    }


    function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
      _tokenIds++;

      uint256 newTokenId = _tokenIds;

      _mint(msg.sender, newTokenId);
      _setTokenURI(newTokenId, tokenURI);
      createMarketItem(newTokenId, price);

      return newTokenId;
    }

    function createMarketItem(uint256 tokenId, uint256 price) private {

      require(price > 0, "Price must be at least 1 wei");

      require(msg.value == listingPrice, "Price must be equal to listing price");


      idToMarketItem[tokenId] =  MarketItem(
        tokenId,
        payable(msg.sender),
        payable(address(this)),
        price,
        false
      );


      _transfer(msg.sender, address(this), tokenId);
      emit MarketItemCreated(
        tokenId,
        msg.sender,
        address(this),
        price,
        false
      );
    }


    function resellToken(uint256 tokenId, uint256 price) public payable {
      require(idToMarketItem[tokenId].owner == msg.sender, "Only item owner can perform this operation");
      require(msg.value == price, "Price must be equal by sender.value");
      idToMarketItem[tokenId].sold = false;
      idToMarketItem[tokenId].price = price;
      idToMarketItem[tokenId].seller = payable(msg.sender);
      idToMarketItem[tokenId].owner = payable(address(this));
      _itemsSold--;

      _transfer(msg.sender, address(this), tokenId);
    }

    function buy(uint256 tokenId) public payable {
      uint price = idToMarketItem[tokenId].price;
      address payable seller = idToMarketItem[tokenId].seller;
      require(msg.value == price, "Please submit the asking price in order to complete the purchase");
      idToMarketItem[tokenId].owner = payable(msg.sender);
      idToMarketItem[tokenId].sold = true;
      idToMarketItem[tokenId].seller = payable(address(0));
      _itemsSold++;
      
      _transfer(address(this), msg.sender, tokenId);
      payable(owner).transfer(listingPrice);
      payable(seller).transfer(msg.value);
      emit NFTPurchased(tokenId, msg.sender, seller, price);
    
    }


    function fetchMarketItems() public view returns (MarketItem[] memory) {
      uint itemCount = _tokenIds;
      uint unsoldItemCount = _tokenIds - _itemsSold;
      uint currentIndex = 0;

      MarketItem[] memory items = new MarketItem[](unsoldItemCount);
      for (uint i = 0; i < itemCount; i++) {

        if (idToMarketItem[i + 1].owner == address(this)) {

          uint currentId = i + 1;

          MarketItem storage currentItem = idToMarketItem[currentId];

          items[currentIndex] = currentItem;

          currentIndex += 1;
        }
      }

      return items;
    }


    function fetchMyNFTs() public view returns (MarketItem[] memory) {
      uint totalItemCount = _tokenIds;
      uint itemCount = 0;
      uint currentIndex = 0;


      for (uint i = 0; i < totalItemCount; i++) {
        // check if nft is mine
        if (idToMarketItem[i + 1].owner == msg.sender) {
          itemCount += 1;
        }
      }

      MarketItem[] memory items = new MarketItem[](itemCount);
      for (uint i = 0; i < totalItemCount; i++) {

        if (idToMarketItem[i + 1].owner == msg.sender) {
          uint currentId = i + 1;
          MarketItem storage currentItem = idToMarketItem[currentId];
          items[currentIndex] = currentItem;
          currentIndex += 1;
        }
      }
      return items;
    }

    function fetchItemsListed() public view returns (MarketItem[] memory) {
      uint totalItemCount = _tokenIds;
      uint itemCount = 0;
      uint currentIndex = 0;

      for (uint i = 0; i < totalItemCount; i++) {
        if (idToMarketItem[i + 1].seller == msg.sender) {
          itemCount += 1;
        }
      }

      MarketItem[] memory items = new MarketItem[](itemCount);
      for (uint i = 0; i < totalItemCount; i++) {
        if (idToMarketItem[i + 1].seller == msg.sender) {
          uint currentId = i + 1;
          MarketItem storage currentItem = idToMarketItem[currentId];
          items[currentIndex] = currentItem;
          currentIndex += 1;
        }
      }
      
      return items;
    }
}

