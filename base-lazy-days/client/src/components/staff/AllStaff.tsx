import { Box, Heading, HStack, Radio, RadioGroup } from '@chakra-ui/react';

import { useTreatments } from '../treatments/hooks/useTreatments';
import { useStaff } from './hooks/useStaff';
import { Staff } from './Staff';

export function AllStaff() {
  // replace with data from React Query
  const { staff, filter, setFilter } = useStaff();
  const treatments = useTreatments();

  return (
    <Box>
      <Heading mt={10} textAlign='center'>
        Our Staff
      </Heading>
      <HStack m={10} spacing={8} justify='center'>
        {staff.map((staffData) => (
          <Staff key={staffData.id} staffData={staffData} />
        ))}
      </HStack>
      {/* filter radio onChange 되면 filter 이 set 되면서 staff 데이터가 필터링됨   */}
      <RadioGroup onChange={setFilter} value={filter}>
        <HStack my={10} spacing={8} justify='center'>
          <Heading size='md'>Filter by treatment:</Heading>
          <Radio value='all'>All</Radio>
          {treatments.map((t) => (
            <Radio key={t.id} value={t.name}>
              {t.name}
            </Radio>
          ))}
        </HStack>
      </RadioGroup>
    </Box>
  );
}
