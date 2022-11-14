import { useState } from 'react';

import {
  Button, 
  Container,
  Flex,
  HStack,
  Heading,
  Link,
  Text,
  IconButton
} from '@chakra-ui/react';

import { Link as RouterLink } from 'react-router-dom';

import { FiMenu } from 'react-icons/fi';

import Sidebar from './Sidebar';

import { links } from  '../../utils/Links';

const Header = () => {

  const [display, setDisplay] = useState('none');

  return (
    <Container maxW='100vw' p={0}>
      <Flex 
        boxShadow='lg'
        align='center' 
        justify={['space-between', 'space-between', 'space-around']}
        px={[4, 4, 0]}
        py={4}
      >

        <Flex align='center' justify='flex-start' >
          <IconButton 
            background='none'
            boxShadow='none'
            display={['flex', 'none']}
            _hover={{ background: 'none' }}
            icon={<FiMenu />}
            onClick={() => { setDisplay('inline-block') }}
            p={0}
          />

          <Link
            as={RouterLink}
            _hover={{
              borderBottom: 'none'
            }}
          >
            <Heading
              size={['lg', 'md', 'lg']}
            >
              We<Text display='inline-block' color='#ff7d1a'>Kart</Text>
            </Heading>
          </Link>
        </Flex>
        
        <Sidebar display={display} setDisplayFunc={setDisplay} />

        <HStack 
          spacing={[3, 3, 10]}
          display={['none', 'flex']}
        >
          { 
            links.map((link, index) => 
              <Link 
                as={RouterLink} 
                borderBottom='solid 4px transparent' 
                display='flex'
                alignItems='center'
                fontSize={['xs', 'xs', 'sm']}
                key={index}
                py={4}
                to={`/${link.path}`}
              >
                {link.icon}
                {link.text}
              </Link>
            ) 
          }
        </HStack>

        <HStack>
          <Button colorScheme='orange' size={['sm', 'sm', 'lg']}>Login</Button>
          <Button colorScheme='orange' size={['sm', 'sm', 'lg']}>Signup</Button>
        </HStack>

      </Flex>
    </Container>
  )
}

export default Header;